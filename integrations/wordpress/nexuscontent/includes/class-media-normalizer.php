<?php
/**
 * WordPress attachment normalization.
 *
 * @package NexusContentCompanion
 */

namespace NexusContent\Companion;

use WP_Post;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Media_Normalizer {
	/** @var array<int, array<string, mixed>|null> */
	private array $cache = array();

	/**
	 * @param mixed $value Media ID, ACF value, attachment object, URL, or null.
	 * @return array<string, mixed>|null
	 */
	public function normalize( $value, ?Diagnostics $diagnostics = null, string $path = '' ): ?array {
		if ( null === $value || '' === $value || false === $value ) {
			return null;
		}

		$id     = $this->attachment_id( $value );
		$direct = $this->direct_data( $value );
		if ( $id > 0 ) {
			if ( array_key_exists( $id, $this->cache ) ) {
				$normalized = $this->cache[ $id ];
			} else {
				if ( ! $this->can_read_attachment( $id ) ) {
					$this->cache[ $id ] = null;
					if ( $diagnostics ) {
						$diagnostics->add( 'warning', Contract::ERROR_MEDIA_UNAVAILABLE, __( 'Attachment is unavailable to the current request.', 'nexuscontent' ), $path );
					}
					return null;
				}
				$normalized         = $this->from_attachment( $id, array() );
				$this->cache[ $id ] = $normalized;
			}
			if ( is_array( $normalized ) && empty( $normalized['alt'] ) && isset( $direct['alt'] ) ) {
				$normalized['alt'] = sanitize_text_field( (string) $direct['alt'] );
			}
		} else {
			$normalized = $this->from_direct( $direct );
		}

		/**
		 * Filters normalized media immediately before it enters page data.
		 *
		 * @param array<string, mixed>|null $normalized Normalized media.
		 * @param mixed                     $value      Original media value.
		 */
		$filtered = apply_filters( 'nexuscontent_media', $normalized, $value );
		$output   = is_array( $filtered ) ? $this->sanitize_output( $filtered ) : null;
		return $output;
	}

	/** @param mixed $value */
	private function attachment_id( $value ): int {
		if ( is_int( $value ) || ( is_string( $value ) && ctype_digit( $value ) ) ) {
			return absint( $value );
		}
		if ( $value instanceof WP_Post ) {
			return 'attachment' === $value->post_type ? $value->ID : 0;
		}
		if ( is_array( $value ) ) {
			return absint( $value['ID'] ?? $value['id'] ?? 0 );
		}
		if ( is_object( $value ) ) {
			return absint( $value->ID ?? $value->id ?? 0 );
		}

		return 0;
	}

	/** @param mixed $value @return array<string, mixed> */
	private function direct_data( $value ): array {
		if ( is_string( $value ) && ! ctype_digit( $value ) ) {
			return array( 'url' => esc_url_raw( $value ) );
		}
		if ( is_array( $value ) ) {
			return $value;
		}
		if ( is_object( $value ) ) {
			return get_object_vars( $value );
		}

		return array();
	}

	private function can_read_attachment( int $id ): bool {
		$post = get_post( $id );
		if ( ! $post instanceof WP_Post || 'attachment' !== $post->post_type ) {
			return false;
		}
		if ( current_user_can( 'read_post', $id ) ) {
			return true;
		}
		if ( ! $post->post_parent ) {
			return 'inherit' === $post->post_status || 'publish' === $post->post_status;
		}

		$parent = get_post( $post->post_parent );
		return $parent instanceof WP_Post && 'publish' === $parent->post_status && '' === $parent->post_password;
	}

	/** @param array<string, mixed> $direct @return array<string, mixed>|null */
	private function from_attachment( int $id, array $direct ): ?array {
		$url = wp_get_attachment_url( $id );
		if ( ! is_string( $url ) || '' === $url ) {
			return null;
		}

		$metadata = wp_get_attachment_metadata( $id );
		$post     = get_post( $id );
		$result   = array(
			'id'       => (string) $id,
			'url'      => esc_url_raw( $url ),
			'alt'      => sanitize_text_field( (string) get_post_meta( $id, '_wp_attachment_image_alt', true ) ),
			'caption'  => $post instanceof WP_Post ? wp_kses_post( $post->post_excerpt ) : '',
			'mimeType' => get_post_mime_type( $id ) ? get_post_mime_type( $id ) : '',
		);
		$sizes    = $this->sizes( $id, is_array( $metadata ) ? $metadata : array() );
		if ( $sizes ) {
			$result['sizes'] = $sizes;
		}
		if ( is_array( $metadata ) && isset( $metadata['width'], $metadata['height'] ) ) {
			$result['width']  = absint( $metadata['width'] );
			$result['height'] = absint( $metadata['height'] );
		}
		if ( '' === $result['alt'] && isset( $direct['alt'] ) ) {
			$result['alt'] = sanitize_text_field( (string) $direct['alt'] );
		}

		return $result;
	}

	/** @param array<string, mixed> $direct @return array<string, mixed>|null */
	private function from_direct( array $direct ): ?array {
		$url = $direct['url'] ?? $direct['URL'] ?? '';
		if ( ! is_string( $url ) || '' === esc_url_raw( $url ) ) {
			return null;
		}

		return $this->sanitize_output(
			array(
				'url'      => $url,
				'alt'      => $direct['alt'] ?? '',
				'caption'  => $direct['caption'] ?? '',
				'width'    => $direct['width'] ?? null,
				'height'   => $direct['height'] ?? null,
				// External/URL-only images carry no attachment metadata, so a
				// generic image mimeType lets the wire boundary treat them as
				// media rather than plain section data.
				'mimeType' => $direct['mime_type'] ?? $direct['mimeType'] ?? 'image/*',
				'sizes'    => $direct['sizes'] ?? array(),
			)
		);
	}

	/** @param array<string, mixed> $metadata @return array<string, array<string, int|string>> */
	private function sizes( int $id, array $metadata ): array {
		$result = array();
		foreach ( array_keys( $metadata['sizes'] ?? array() ) as $name ) {
			$image = wp_get_attachment_image_src( $id, $name );
			if ( is_array( $image ) ) {
				$result[ sanitize_key( (string) $name ) ] = array(
					'url'    => esc_url_raw( $image[0] ),
					'width'  => absint( $image[1] ),
					'height' => absint( $image[2] ),
				);
				if ( is_string( $metadata['sizes'][ $name ]['mime-type'] ?? null ) ) {
					$result[ sanitize_key( (string) $name ) ]['mimeType'] = sanitize_text_field( $metadata['sizes'][ $name ]['mime-type'] );
				}
			}
		}

		return $result;
	}

	/** @param array<string, mixed> $value @return array<string, mixed> */
	private function sanitize_output( array $value ): array {
		$result = array( 'url' => esc_url_raw( (string) ( $value['url'] ?? '' ) ) );
		if ( isset( $value['id'] ) ) {
			$result['id'] = (string) absint( $value['id'] );
		}
		foreach ( array( 'alt', 'mimeType' ) as $key ) {
			if ( isset( $value[ $key ] ) && '' !== $value[ $key ] ) {
				$result[ $key ] = sanitize_text_field( (string) $value[ $key ] );
			}
		}
		if ( isset( $value['caption'] ) && '' !== $value['caption'] ) {
			$result['caption'] = wp_kses_post( (string) $value['caption'] );
		}
		foreach ( array( 'width', 'height' ) as $key ) {
			if ( isset( $value[ $key ] ) ) {
				$result[ $key ] = absint( $value[ $key ] );
			}
		}
		$sizes = isset( $value['sizes'] ) && is_array( $value['sizes'] ) ? $this->sanitize_sizes( $value['sizes'] ) : array();
		if ( $sizes ) {
			$result['sizes'] = $sizes;
		}

		return $result;
	}

	/** @param array<string, mixed> $sizes @return array<string, array<string, int|string>> */
	private function sanitize_sizes( array $sizes ): array {
		$result = array();
		foreach ( $sizes as $name => $size ) {
			if ( ! is_string( $name ) || str_ends_with( $name, '-width' ) || str_ends_with( $name, '-height' ) ) {
				continue;
			}
			if ( is_string( $size ) ) {
				$size = array(
					'url'    => $size,
					'width'  => $sizes[ $name . '-width' ] ?? null,
					'height' => $sizes[ $name . '-height' ] ?? null,
				);
			}
			if ( ! is_array( $size ) || ! is_string( $size['url'] ?? null ) || '' === esc_url_raw( $size['url'] ) ) {
				continue;
			}
			$item = array( 'url' => esc_url_raw( $size['url'] ) );
			foreach ( array( 'width', 'height' ) as $dimension ) {
				if ( isset( $size[ $dimension ] ) ) {
					$item[ $dimension ] = absint( $size[ $dimension ] );
				}
			}
			if ( is_string( $size['mimeType'] ?? null ) || is_string( $size['mime-type'] ?? null ) ) {
				$item['mimeType'] = sanitize_text_field( (string) ( $size['mimeType'] ?? $size['mime-type'] ) );
			}
			$result[ sanitize_key( $name ) ] = $item;
		}

		return $result;
	}
}
