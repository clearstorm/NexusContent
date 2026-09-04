<?php
/**
 * Per-page SEO authoring and normalization.
 *
 * Imported from the Astro or other consumer as additive optional `seo` data on
 * the companion wire. Both the Gutenberg sidebar and the ACF metabox write the
 * same flat `nexus_seo_*` post meta keys so the server normalizes them into one
 * `seo` object regardless of editor mode.
 *
 * @package NexusContentCompanion
 */

namespace NexusContent\Companion;

use WP_Post;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Seo_Fields {
	public const META_PREFIX = 'nexus_seo_';

	/** @var array<int, string> */
	private const STRING_KEYS = array( 'title', 'description', 'canonical', 'og_title', 'og_description', 'og_type', 'og_image', 'tw_card', 'tw_title', 'tw_description', 'tw_image', 'tw_site' );

	/** @var array<int, string> */
	private const BOOL_KEYS = array( 'robots_index', 'robots_follow', 'robots_noarchive', 'robots_nosnippet' );

	public const POST_TYPES = array( 'page', 'post' );

	public function register(): void {
		add_action( 'init', array( $this, 'register_meta' ) );
	}

	public function register_meta(): void {
		$keys = array_merge( self::STRING_KEYS, self::BOOL_KEYS );
		foreach ( $keys as $key ) {
			$args = array(
				'type'              => in_array( $key, self::BOOL_KEYS, true ) ? 'boolean' : 'string',
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => array( $this, 'sanitize' ),
				'auth_callback'     => static function ( bool $allowed, string $meta_key, int $post_id ): bool {
					return current_user_can( 'edit_post', $post_id );
				},
			);
			foreach ( self::POST_TYPES as $post_type ) {
				register_post_meta( $post_type, self::META_PREFIX . $key, $args );
			}
		}
	}

	/** @param mixed $value */
	public function sanitize( $value, string $meta_key ) {
		if ( in_array( str_replace( self::META_PREFIX, '', $meta_key ), self::BOOL_KEYS, true ) ) {
			return (bool) $value;
		}
		return is_string( $value ) ? sanitize_text_field( $value ) : '';
	}

	/**
	 * Normalize editor-authored SEO meta into the additive optional wire
	 * `seo` object.
	 *
	 * @param int $post_id Post ID.
	 * @return array<string, mixed>
	 */
	public function read( int $post_id ): array {
		$seo = array();

		$direct = array(
			'title'       => 'title',
			'description' => 'description',
			'canonical'   => 'canonicalUrl',
		);
		foreach ( $direct as $meta => $wire_key ) {
			$value = $this->meta_string( $post_id, $meta );
			if ( '' !== $value ) {
				$seo[ $wire_key ] = $value;
			}
		}

		$robots = $this->read_robots( $post_id );
		if ( $robots ) {
			$seo['robots'] = $robots;
		}

		$og = $this->read_network( $post_id, 'og' );
		if ( $og ) {
			$seo['openGraph'] = $og;
		}

		$twitter = $this->read_network( $post_id, 'tw' );
		if ( $twitter ) {
			$seo['twitter'] = $twitter;
		}

		return $seo;
	}

	/**
	 * @param int    $post_id Post ID.
	 * @param string $prefix  Meta prefix ('og' or 'tw').
	 * @return array<string, mixed>
	 */
	private function read_network( int $post_id, string $prefix ): array {
		$out   = array();
		$title = $this->meta_string( $post_id, $prefix . '_title' );
		if ( '' !== $title ) {
			$out['title'] = $title;
		}
		$description = $this->meta_string( $post_id, $prefix . '_description' );
		if ( '' !== $description ) {
			$out['description'] = $description;
		}

		if ( 'og' === $prefix ) {
			$type = $this->meta_string( $post_id, 'og_type' );
			if ( '' !== $type ) {
				$out['type'] = $type;
			}
		} else {
			$card = $this->meta_string( $post_id, 'tw_card' );
			if ( in_array( $card, array( 'summary', 'summary_large_image' ), true ) ) {
				$out['card'] = $card;
			}
			$site = $this->meta_string( $post_id, 'tw_site' );
			if ( '' !== $site ) {
				$out['site'] = $site;
			}
		}

		$image = $this->image_meta( $this->meta_string( $post_id, $prefix . '_image' ) );
		if ( $image ) {
			$out['image'] = $image;
		}

		return $out;
	}

	/** @return array<string, bool>|null */
	private function read_robots( int $post_id ): ?array {
		$map    = array(
			'robots_index'     => 'index',
			'robots_follow'    => 'follow',
			'robots_noarchive' => 'noarchive',
			'robots_nosnippet' => 'nosnippet',
		);
		$robots = array();
		$any    = false;
		foreach ( $map as $meta => $key ) {
			$meta_key       = self::META_PREFIX . $meta;
			$value          = get_post_meta( $post_id, $meta_key, true );
			$robots[ $key ] = (bool) $value;
			if ( metadata_exists( 'post', $post_id, $meta_key ) ) {
				$any = true;
			}
		}
		return $any ? $robots : null;
	}

	/** @return array<string, string|int>|null */
	private function image_meta( string $value ): ?array {
		if ( '' === $value ) {
			return null;
		}
		if ( filter_var( $value, FILTER_VALIDATE_URL ) ) {
			return array( 'url' => esc_url_raw( $value ) );
		}
		$attachment = absint( $value );
		if ( $attachment > 0 ) {
			$src = wp_get_attachment_image_src( $attachment, 'full' );
			if ( is_array( $src ) ) {
				return array(
					'url'    => $src[0],
					'width'  => (int) $src[1],
					'height' => (int) $src[2],
				);
			}
		}
		return null;
	}

	private function meta_string( int $post_id, string $meta ): string {
		$value = get_post_meta( $post_id, self::META_PREFIX . $meta, true );
		return is_string( $value ) ? trim( $value ) : '';
	}
}
