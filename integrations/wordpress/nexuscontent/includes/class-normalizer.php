<?php
/**
 * Page and section normalization pipelines.
 *
 * @package NexusContentCompanion
 */

namespace NexusContent\Companion;

use WP_Post;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Normalizer {
	private const MAX_BLOCK_DEPTH  = 20;
	private const RICH_BLOCKS      = array( 'core/paragraph', 'core/heading', 'core/list', 'core/quote', 'core/buttons', 'core/button', 'core/spacer' );
	private const CONTAINER_BLOCKS = array( 'core/group', 'core/columns', 'core/column' );

	private Editor_Mode $editor_mode;
	private Section_Registry $registry;
	private Media_Normalizer $media;

	public function __construct( Editor_Mode $editor_mode, Section_Registry $registry, Media_Normalizer $media ) {
		$this->editor_mode = $editor_mode;
		$this->registry    = $registry;
		$this->media       = $media;
	}

	/** @return array<string, mixed> */
	public function page( WP_Post $post, Diagnostics $diagnostics ): array {
		$mode = $this->editor_mode->get( $post->ID );
		if ( $this->source_count( $post ) > 1 ) {
			$diagnostics->add( 'warning', Contract::ERROR_CONFLICTING_SECTION_SOURCES, __( 'Multiple section sources contain content; only the selected editor mode was normalized.', 'nexuscontent' ), Editor_Mode::META_KEY );
		}
		// A page is read from exactly one source. Inactive editor data is never merged.
		$sections = match ( $mode ) {
			Editor_Mode::ACF_FLEXIBLE => $this->flexible_sections( $post, $diagnostics ),
			Editor_Mode::ACF_FIXED    => $this->fixed_sections( $post, $diagnostics ),
			default                   => $this->block_sections( $post, $diagnostics ),
		};

		$modified       = get_post_modified_time( DATE_ATOM, true, $post );
		$page           = array(
			'id'         => (string) $post->ID,
			'key'        => '' !== $post->post_name ? $post->post_name : (string) $post->ID,
			'slug'       => $post->post_name,
			'title'      => get_the_title( $post ),
			'status'     => $this->page_status( $post->post_status ),
			'excerpt'    => wp_kses_post( $post->post_excerpt ),
			'modifiedAt' => is_string( $modified ) ? $modified : '',
			'sections'   => array_values( array_filter( $sections ) ),
			// The rendered body is always exposed so consumers can fall back
			// to raw HTML when a post yields no structured sections. This is
			// the same rendered content the WordPress core REST API exposes as
			// `content.rendered`. Rendered HTML remains untrusted external
			// content; sanitization and trust decisions belong to the consumer.
			'rawFields'  => array(
				'editorMode' => $mode,
				'content'    => wp_kses_post( apply_filters( 'the_content', $post->post_content ) ),
			),
		);
		$featured_image = $this->media->normalize( get_post_thumbnail_id( $post ), $diagnostics, 'featuredImage' );
		if ( $featured_image ) {
			$page['featuredImage'] = $featured_image;
		}

		/**
		 * Filters a normalized page before contract validation and REST output.
		 *
		 * @param array<string, mixed> $page Normalized page.
		 * @param WP_Post              $post Source page.
		 */
		$filtered = apply_filters( 'nexuscontent_page_data', $page, $post );
		return is_array( $filtered ) ? $filtered : $page;
	}

	/** @return array<int, array<string, mixed>> */
	private function block_sections( WP_Post $post, Diagnostics $diagnostics ): array {
		$blocks   = parse_blocks( $post->post_content );
		$sequence = 0;
		return $this->walk_blocks( is_array( $blocks ) ? $blocks : array(), $post->ID, $diagnostics, 0, $sequence );
	}

	/**
	 * @param array<int, mixed> $blocks Parsed blocks.
	 * @return array<int, array<string, mixed>>
	 */
	private function walk_blocks( array $blocks, int $post_id, Diagnostics $diagnostics, int $depth, int &$sequence ): array {
		if ( $depth > self::MAX_BLOCK_DEPTH ) {
			$diagnostics->add( 'error', Contract::ERROR_MALFORMED_BLOCK_CONTENT, __( 'Maximum block nesting depth exceeded.', 'nexuscontent' ), 'content' );
			return array();
		}

		$sections = array();
		$rich     = array();
		foreach ( $blocks as $block_index => $block ) {
			if ( ! is_array( $block ) ) {
				continue;
			}
			$name  = is_string( $block['blockName'] ?? null ) ? $block['blockName'] : '';
			$attrs = is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array();

			$type = '' !== $name ? $this->registry->resolve( $name ) : null;
			if ( $type ) {
				$this->flush_rich( $sections, $rich, $post_id, $sequence );
				$data = isset( $attrs['data'] ) && is_array( $attrs['data'] ) ? $this->public_acf_data( $attrs['data'] ) : $this->public_attributes( $attrs );
				if ( ! empty( $block['innerHTML'] ) && ! isset( $data['body'] ) && 'form_embed' !== $type ) {
					$data['body'] = wp_kses_post( (string) $block['innerHTML'] );
				}
				$section = $this->section( $type, $data, $attrs, $post_id, $sequence++, $name, $diagnostics );
				if ( $section ) {
					$sections[] = $section;
				}
				continue;
			}

			if ( in_array( $name, self::RICH_BLOCKS, true ) || '' === $name ) {
				$html = $this->block_html( $block );
				if ( '' !== trim( wp_strip_all_tags( $html ) ) || 'core/spacer' === $name ) {
					$rich[] = array(
						'type'       => '' !== $name ? $name : 'core/freeform',
						'content'    => $html,
						'attributes' => $this->json_value( $attrs, $diagnostics, 'content.blocks.' . $block_index ),
					);
				}
				continue;
			}

			if ( in_array( $name, self::CONTAINER_BLOCKS, true ) ) {
				$this->flush_rich( $sections, $rich, $post_id, $sequence );
				$children = is_array( $block['innerBlocks'] ?? null ) ? $block['innerBlocks'] : array();
				$sections = array_merge( $sections, $this->walk_blocks( $children, $post_id, $diagnostics, $depth + 1, $sequence ) );
				continue;
			}

			if ( 'core/image' === $name ) {
				$this->flush_rich( $sections, $rich, $post_id, $sequence );
				$urls    = wp_extract_urls( (string) ( $block['innerHTML'] ?? '' ) );
				$media   = $this->media->normalize( $attrs['id'] ?? $attrs['url'] ?? ( $urls[0] ?? null ), $diagnostics, 'content.blocks.' . $block_index );
				$section = $this->section(
					'image_text',
					array(
						'image' => $media,
						'body'  => wp_kses_post( (string) ( $block['innerHTML'] ?? '' ) ),
					),
					$attrs,
					$post_id,
					$sequence++,
					$name,
					$diagnostics
				);
				if ( $section ) {
					$sections[] = $section;
				}
				continue;
			}

			if ( 'core/gallery' === $name ) {
				$this->flush_rich( $sections, $rich, $post_id, $sequence );
				$images = array();
				foreach ( (array) ( $attrs['ids'] ?? array() ) as $image_id ) {
					$image = $this->media->normalize( $image_id, $diagnostics, 'content.blocks.' . $block_index );
					if ( $image ) {
						$images[] = $image;
					}
				}
				foreach ( (array) ( $block['innerBlocks'] ?? array() ) as $image_block ) {
					if ( ! is_array( $image_block ) || 'core/image' !== ( $image_block['blockName'] ?? '' ) ) {
						continue;
					}
					$image_attrs = is_array( $image_block['attrs'] ?? null ) ? $image_block['attrs'] : array();
					$urls        = wp_extract_urls( (string) ( $image_block['innerHTML'] ?? '' ) );
					$image       = $this->media->normalize( $image_attrs['id'] ?? $image_attrs['url'] ?? ( $urls[0] ?? null ), $diagnostics, 'content.blocks.' . $block_index );
					if ( $image && ! in_array( $image, $images, true ) ) {
						$images[] = $image;
					}
				}
				$section = $this->section( 'gallery', array( 'images' => $images ), $attrs, $post_id, $sequence++, $name, $diagnostics );
				if ( $section ) {
					$sections[] = $section;
				}
				continue;
			}

			if ( 'core/cover' === $name ) {
				$this->flush_rich( $sections, $rich, $post_id, $sequence );
				$media   = $this->media->normalize( $attrs['id'] ?? $attrs['url'] ?? null, $diagnostics, 'content.blocks.' . $block_index );
				$section = $this->section(
					'hero',
					array(
						'image' => $media,
						'body'  => wp_kses_post( (string) ( $block['innerHTML'] ?? '' ) ),
					),
					$attrs,
					$post_id,
					$sequence++,
					$name,
					$diagnostics
				);
				if ( $section ) {
					$sections[] = $section;
				}
				continue;
			}

			$preserved = $this->unknown_block( $block, $name, $rich, $diagnostics, $block_index );
			if ( ! $preserved && ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				$this->flush_rich( $sections, $rich, $post_id, $sequence );
				$sections = array_merge( $sections, $this->walk_blocks( $block['innerBlocks'], $post_id, $diagnostics, $depth + 1, $sequence ) );
			}
		}

		$this->flush_rich( $sections, $rich, $post_id, $sequence );
		return $sections;
	}

	/** @return array<int, array<string, mixed>> */
	private function flexible_sections( WP_Post $post, Diagnostics $diagnostics ): array {
		if ( ! function_exists( 'get_field' ) ) {
			$diagnostics->add( 'error', Contract::ERROR_UNSUPPORTED_EDITOR_MODE, __( 'ACF flexible mode is active, but ACF is unavailable.', 'nexuscontent' ), Editor_Mode::META_KEY );
			return array();
		}

		$rows = get_field( 'nexus_sections', $post->ID, false );
		if ( ! is_array( $rows ) ) {
			return array();
		}

		$sections = array();
		foreach ( $rows as $index => $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$layout = is_string( $row['acf_fc_layout'] ?? null ) ? $row['acf_fc_layout'] : '';
			$type   = $this->registry->resolve( $layout );
			if ( ! $type ) {
				$diagnostics->add( 'warning', Contract::ERROR_UNKNOWN_ACF_LAYOUT, __( 'Unknown ACF flexible layout was not normalized.', 'nexuscontent' ), 'nexus_sections.' . $index );
				continue;
			}
			unset( $row['acf_fc_layout'] );
			$section = $this->section( $type, $row, $row, $post->ID, $index, $layout, $diagnostics );
			if ( $section ) {
				$sections[] = $section;
			}
		}

		return $sections;
	}

	/** @return array<int, array<string, mixed>> */
	private function fixed_sections( WP_Post $post, Diagnostics $diagnostics ): array {
		if ( ! function_exists( 'get_field' ) ) {
			$diagnostics->add( 'error', Contract::ERROR_UNSUPPORTED_EDITOR_MODE, __( 'ACF fixed mode is active, but ACF is unavailable.', 'nexuscontent' ), Editor_Mode::META_KEY );
			return array();
		}

		$sections = array();
		foreach ( $this->registry->fixed_types() as $type ) {
			if ( ! get_field( $type . '_enabled', $post->ID, false ) ) {
				continue;
			}
			$data       = array();
			$definition = $this->registry->definitions()[ $type ];
			foreach ( $definition['fields'] as $field ) {
				$name = is_array( $field ) && is_string( $field['name'] ?? null ) ? $field['name'] : '';
				if ( '' !== $name ) {
					$data[ $name ] = get_field( $type . '_' . $name, $post->ID, false );
				}
			}
			if ( ! $this->has_section_content( $data ) ) {
				$diagnostics->add( 'warning', Contract::ERROR_INVALID_FIXED_SECTION, __( 'An enabled fixed section was empty and was omitted.', 'nexuscontent' ), $type . '_enabled' );
				continue;
			}
			$section = $this->section( $type, $data, $data, $post->ID, count( $sections ), $type, $diagnostics );
			if ( $section ) {
				$sections[] = $section;
			}
		}

		return $sections;
	}

	/**
	 * @param array<string, mixed> $data Raw section data.
	 * @param array<string, mixed> $source Source attributes.
	 * @return array<string, mixed>
	 */
	private function section( string $type, array $data, array $source, int $post_id, int $index, string $source_identifier, Diagnostics $diagnostics ): array {
		$embed_code = null;
		if ( 'form_embed' === $type && is_string( $data['embed_code'] ?? null ) ) {
			$embed_code = Contract::sanitize_embed( $data['embed_code'] );
			unset( $data['embed_code'] );
		}

		$data       = $this->normalize_media_values( $data, $diagnostics, 'sections.' . $index );
		$normalized = $this->json_value( $data, $diagnostics, 'sections.' . $index );
		$normalized = is_array( $normalized ) ? $normalized : array();
		$normalized = $this->remove_null_values( $normalized );
		if ( null !== $embed_code ) {
			$normalized['embed_code'] = $embed_code;
		}
		$settings = array();
		foreach ( array( 'variant', 'theme' ) as $setting ) {
			if ( isset( $normalized[ $setting ] ) && '' !== $normalized[ $setting ] ) {
				$settings[ $setting ] = $normalized[ $setting ];
			}
			unset( $normalized[ $setting ] );
		}
		unset( $normalized['section_id'] );

		/**
		 * Filters normalized data for one canonical section.
		 *
		 * @param array<string, mixed> $normalized Normalized section data.
		 * @param string               $type       Canonical section type.
		 * @param int                  $post_id    Source page ID.
		 */
		$filtered = apply_filters( 'nexuscontent_section_data', $normalized, $type, $post_id );
		$data     = is_array( $filtered ) ? $filtered : $normalized;

		$section = array(
			'id'   => $this->section_id( $source, $post_id, $type, $index, $source_identifier ),
			'type' => $type,
			'data' => $data,
		);
		if ( isset( $source['settings'] ) && is_array( $source['settings'] ) ) {
			$settings = array_merge( $settings, $source['settings'] );
		}
		if ( $settings ) {
			$section['settings'] = $this->json_value( $settings, $diagnostics, 'sections.' . $index . '.settings' );
		}

		return $section;
	}

	/** @param array<int, array<string, mixed>> $sections @param array<int, array<string, mixed>> $rich */
	private function flush_rich( array &$sections, array &$rich, int $post_id, int &$sequence ): void {
		if ( empty( $rich ) ) {
			return;
		}
		$sections[] = array(
			'id'   => $this->deterministic_id( $post_id, 'rich_text', $sequence++ ),
			'type' => 'rich_text',
			'data' => array(
				'body'   => implode( "\n", array_column( $rich, 'content' ) ),
				'blocks' => array_values( $rich ),
			),
		);
		$rich       = array();
	}

	/** @param array<string, mixed> $block @param array<int, array<string, mixed>> $rich */
	private function unknown_block( array $block, string $name, array &$rich, Diagnostics $diagnostics, int $index ): bool {
		$html    = $this->block_html( $block );
		$visible = '' !== trim( wp_strip_all_tags( $html ) );
		$code    = str_starts_with( $name, 'acf/' ) ? Contract::ERROR_UNKNOWN_ACF_BLOCK : Contract::ERROR_UNKNOWN_BLOCK;
		$diagnostics->add( 'warning', $code, __( 'An unsupported block was encountered during normalization.', 'nexuscontent' ), 'content.blocks.' . $index );
		if ( $visible ) {
			$rich[] = array(
				'type'        => '' !== $name ? $name : 'core/freeform',
				'content'     => $html,
				'attributes'  => array(),
				'unsupported' => true,
			);
		}

		return $visible;
	}

	/** @param array<string, mixed> $block */
	private function block_html( array $block, int $depth = 0 ): string {
		if ( $depth > self::MAX_BLOCK_DEPTH ) {
			return '';
		}
		$html = wp_kses_post( (string) ( $block['innerHTML'] ?? '' ) );
		foreach ( (array) ( $block['innerBlocks'] ?? array() ) as $child ) {
			if ( is_array( $child ) ) {
				$html .= $this->block_html( $child, $depth + 1 );
			}
		}

		return $html;
	}

	/** @param array<string, mixed> $attrs @return array<string, mixed> */
	private function public_attributes( array $attrs ): array {
		foreach ( array( 'id', 'section_id', 'anchor', 'name', 'mode', 'align', 'className', 'preview' ) as $key ) {
			unset( $attrs[ $key ] );
		}

		return $attrs;
	}

	/** @param array<string, mixed> $data @return array<string, mixed> */
	private function public_acf_data( array $data ): array {
		foreach ( array_keys( $data ) as $key ) {
			if ( is_string( $key ) && str_starts_with( $key, '_' ) ) {
				unset( $data[ $key ] );
			}
		}

		return $data;
	}

	/** @param array<string, mixed> $source */
	private function section_id( array $source, int $post_id, string $type, int $index, string $source_identifier ): string {
		foreach ( array( $source['section_id'] ?? null, $source['sectionId'] ?? null, $source['data']['section_id'] ?? null, $source['anchor'] ?? null, $source['id'] ?? null ) as $candidate ) {
			if ( is_string( $candidate ) && '' !== sanitize_title( $candidate ) ) {
				return sanitize_title( $candidate );
			}
		}
		if ( '' !== $source_identifier && ! str_contains( $source_identifier, '/' ) ) {
			$identifier = sanitize_title( $source_identifier );
			if ( '' !== $identifier && $identifier !== $type ) {
				return $identifier;
			}
		}

		return $this->deterministic_id( $post_id, $type, $index );
	}

	private function deterministic_id( int $post_id, string $type, int $index ): string {
		return sprintf( 'page-%d-%s-%d', $post_id, sanitize_title( $type ), $index );
	}

	private function page_status( string $status ): string {
		return match ( $status ) {
			'publish' => 'published',
			'trash'   => 'archived',
			default   => 'draft',
		};
	}

	/** @param mixed $value @return mixed */
	private function json_value( $value, Diagnostics $diagnostics, string $path, int $depth = 0 ) {
		if ( $depth > self::MAX_BLOCK_DEPTH ) {
			$diagnostics->add( 'warning', Contract::ERROR_INVALID_SECTION, __( 'Section data exceeded the normalization depth limit.', 'nexuscontent' ), $path );
			return null;
		}
		if ( null === $value || is_bool( $value ) || is_int( $value ) || is_float( $value ) ) {
			return $value;
		}
		if ( is_string( $value ) ) {
			return wp_kses_post( $value );
		}
		if ( $value instanceof WP_Post && 'attachment' === $value->post_type ) {
			return $this->media->normalize( $value, $diagnostics, $path );
		}
		if ( is_object( $value ) ) {
			$value = get_object_vars( $value );
		}
		if ( ! is_array( $value ) ) {
			return null;
		}
		if ( ( isset( $value['ID'] ) || isset( $value['id'] ) ) && ( isset( $value['url'] ) || isset( $value['URL'] ) || isset( $value['mime_type'] ) ) ) {
			return $this->media->normalize( $value, $diagnostics, $path );
		}

		$result = array();
		foreach ( $value as $key => $child ) {
			$result[ is_int( $key ) ? $key : sanitize_key( (string) $key ) ] = $this->json_value( $child, $diagnostics, $path . '.' . $key, $depth + 1 );
		}

		return $result;
	}

	/** @param mixed $value @return mixed */
	private function normalize_media_values( $value, Diagnostics $diagnostics, string $path, string $field = '' ) {
		if ( in_array( $field, array( 'image', 'background_image', 'logo' ), true ) ) {
			return $this->media->normalize( $value, $diagnostics, $path );
		}
		if ( 'images' === $field && is_array( $value ) ) {
			$result = array();
			foreach ( $value as $index => $image ) {
				$normalized = $this->media->normalize( $image, $diagnostics, $path . '.' . $index );
				if ( $normalized ) {
					$result[] = $normalized;
				}
			}
			return $result;
		}
		if ( is_object( $value ) ) {
			$value = get_object_vars( $value );
		}
		if ( ! is_array( $value ) ) {
			return $value;
		}

		$result = array();
		foreach ( $value as $key => $child ) {
			$name           = is_string( $key ) ? sanitize_key( $key ) : '';
			$result[ $key ] = $this->normalize_media_values( $child, $diagnostics, $path . '.' . $key, $name );
		}
		return $result;
	}

	/** @param array<string, mixed> $data */
	private function has_section_content( array $data ): bool {
		foreach ( $data as $key => $value ) {
			if ( in_array( $key, array( 'section_id', 'variant', 'theme' ), true ) ) {
				continue;
			}
			if ( is_array( $value ) && $this->has_section_content( $value ) ) {
				return true;
			}
			if ( ! is_array( $value ) && null !== $value && false !== $value && '' !== trim( (string) $value ) ) {
				return true;
			}
		}
		return false;
	}

	/** @param array<mixed> $value @return array<mixed> */
	private function remove_null_values( array $value ): array {
		$result = array();
		foreach ( $value as $key => $child ) {
			if ( null === $child ) {
				continue;
			}
			$result[ $key ] = is_array( $child ) ? $this->remove_null_values( $child ) : $child;
		}

		return array_is_list( $value ) ? array_values( $result ) : $result;
	}

	private function source_count( WP_Post $post ): int {
		$count    = '' !== trim( $post->post_content ) ? 1 : 0;
		$flexible = metadata_exists( 'post', $post->ID, 'nexus_sections' ) && get_post_meta( $post->ID, 'nexus_sections', true );
		if ( ! $flexible && function_exists( 'get_field' ) ) {
			$flexible = get_field( 'nexus_sections', $post->ID, false );
		}
		if ( $flexible ) {
			++$count;
		}
		foreach ( $this->registry->fixed_field_keys() as $key ) {
			$value = metadata_exists( 'post', $post->ID, $key ) ? get_post_meta( $post->ID, $key, true ) : null;
			if ( ! $value && function_exists( 'get_field' ) ) {
				$value = get_field( $key, $post->ID, false );
			}
			if ( $value ) {
				++$count;
				break;
			}
		}

		return $count;
	}
}
