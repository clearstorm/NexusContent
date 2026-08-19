<?php
/**
 * Shared normalization and safe fallback rendering for NexusContent blocks.
 *
 * @package NexusContent
 */

namespace NexusContent\Companion;

defined( 'ABSPATH' ) || exit;

final class Block_Normalizer {
	/**
	 * Normalize block attributes to JSON-compatible section data.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @return array<string, mixed>
	 */
	public static function normalize( $attributes ) {
		$normalized = array();

		foreach ( (array) $attributes as $key => $value ) {
			if ( ! is_string( $key ) || 'preview' === $key || 0 === strpos( $key, '_' ) ) {
				continue;
			}

			$normalized[ sanitize_key( $key ) ] = self::normalize_value( $value );
		}

		return $normalized;
	}

	/**
	 * Render a semantic fallback when a theme has no custom block renderer.
	 *
	 * @param string               $type       Section type.
	 * @param array<string, mixed> $attributes Block attributes.
	 * @return string
	 */
	public static function render( $type, $attributes ) {
		$data    = self::normalize( $attributes );
		$wrapper = array( 'class' => 'nexuscontent-section nexuscontent-section--' . sanitize_html_class( $type ) );
		if ( is_string( $data['section_id'] ?? null ) && '' !== sanitize_title( $data['section_id'] ) ) {
			$wrapper['id'] = sanitize_title( $data['section_id'] );
		}
		$attributes = function_exists( 'get_block_wrapper_attributes' )
			? get_block_wrapper_attributes( $wrapper )
			: 'class="nexuscontent-section nexuscontent-section--' . esc_attr( $type ) . '"';
		$content    = self::render_section_content( $type, $data );

		if ( '' === $content ) {
			return '';
		}

		return '<section ' . $attributes . '>' . $content . '</section>';
	}

	/**
	 * @param mixed $value Untrusted value.
	 * @return mixed
	 */
	private static function normalize_value( $value ) {
		if ( is_null( $value ) || is_bool( $value ) || is_int( $value ) || is_float( $value ) ) {
			return $value;
		}

		if ( is_string( $value ) ) {
			return wp_check_invalid_utf8( $value );
		}

		if ( is_object( $value ) ) {
			$value = get_object_vars( $value );
		}

		if ( is_array( $value ) ) {
			$result = array();
			foreach ( $value as $key => $item ) {
				$result[ is_string( $key ) ? sanitize_key( $key ) : $key ] = self::normalize_value( $item );
			}
			return $result;
		}

		return null;
	}

	/**
	 * @param string               $type Section type.
	 * @param array<string, mixed> $data Normalized data.
	 * @return string
	 */
	private static function render_section_content( $type, $data ) {
		$output = self::heading( $data );

		if ( isset( $data['eyebrow'] ) && is_string( $data['eyebrow'] ) && '' !== $data['eyebrow'] ) {
			$output = '<p class="nexuscontent-section__eyebrow">' . esc_html( $data['eyebrow'] ) . '</p>' . $output;
		}

		if ( isset( $data['body'] ) && is_string( $data['body'] ) ) {
			$output .= '<div class="nexuscontent-section__body">' . wp_kses_post( wpautop( $data['body'] ) ) . '</div>';
		}

		if ( in_array( $type, array( 'hero', 'intro', 'image_text' ), true ) && isset( $data['image'] ) ) {
			$output .= self::render_media( $data['image'] );
		}
		if ( 'cta' === $type && isset( $data['background_image'] ) ) {
			$output .= self::render_media( $data['background_image'] );
		}

		foreach ( array( 'primary_action', 'secondary_action', 'action' ) as $action ) {
			$url_key   = $action . '_url';
			$label_key = $action . '_label';
			if ( isset( $data[ $url_key ] ) && is_string( $data[ $url_key ] ) ) {
				$output .= self::render_link(
					array(
						'url'   => $data[ $url_key ],
						'label' => $data[ $label_key ] ?? $data[ $url_key ],
					)
				);
			}
		}

		if ( 'gallery' === $type && isset( $data['images'] ) ) {
			$output .= self::render_gallery( $data['images'] );
		}

		if ( 'form_embed' === $type && isset( $data['embed_code'] ) && is_string( $data['embed_code'] ) ) {
			$output .= '<div class="nexuscontent-section__embed">' . self::sanitize_embed( $data['embed_code'] ) . '</div>';
		}

		if ( isset( $data['items'] ) && is_array( $data['items'] ) ) {
			$output .= self::render_items( $type, $data['items'] );
		}

		return $output;
	}

	/**
	 * @param array<string, mixed> $data Section data.
	 * @return string
	 */
	private static function heading( $data ) {
		if ( ! isset( $data['heading'] ) || ! is_string( $data['heading'] ) || '' === $data['heading'] ) {
			return '';
		}

		return '<h2 class="nexuscontent-section__heading">' . esc_html( $data['heading'] ) . '</h2>';
	}

	/**
	 * @param mixed $media Media value.
	 * @return string
	 */
	private static function render_media( $media ) {
		if ( is_numeric( $media ) ) {
			return wp_get_attachment_image( (int) $media, 'large', false, array( 'class' => 'nexuscontent-section__image' ) );
		}

		if ( ! is_array( $media ) ) {
			return '';
		}

		$id = isset( $media['id'] ) ? absint( $media['id'] ) : 0;
		if ( $id ) {
			return wp_get_attachment_image( $id, 'large', false, array( 'class' => 'nexuscontent-section__image' ) );
		}

		$url = isset( $media['url'] ) && is_string( $media['url'] ) ? esc_url( $media['url'] ) : '';
		if ( '' === $url ) {
			return '';
		}

		$alt = isset( $media['alt'] ) && is_string( $media['alt'] ) ? $media['alt'] : '';
		return '<img class="nexuscontent-section__image" src="' . $url . '" alt="' . esc_attr( $alt ) . '" loading="lazy">';
	}

	/**
	 * @param mixed $link Link value.
	 * @return string
	 */
	private static function render_link( $link ) {
		if ( ! is_array( $link ) || empty( $link['url'] ) || ! is_string( $link['url'] ) ) {
			return '';
		}

		$label  = isset( $link['label'] ) && is_string( $link['label'] ) ? $link['label'] : $link['url'];
		$target = isset( $link['target'] ) && '_blank' === $link['target'] ? ' target="_blank" rel="noopener noreferrer"' : '';
		return '<a class="nexuscontent-section__link" href="' . esc_url( $link['url'] ) . '"' . $target . '>' . esc_html( $label ) . '</a>';
	}

	/**
	 * @param string              $type  Section type.
	 * @param array<int, mixed>   $items Item values.
	 * @return string
	 */
	private static function render_items( $type, $items ) {
		if ( empty( $items ) ) {
			return '';
		}

		$tag    = 'faq' === $type ? 'dl' : 'ul';
		$output = '<' . $tag . ' class="nexuscontent-section__items">';

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			if ( 'faq' === $type ) {
				$question = isset( $item['question'] ) ? esc_html( (string) $item['question'] ) : '';
				$answer   = isset( $item['answer'] ) ? wp_kses_post( wpautop( (string) $item['answer'] ) ) : '';
				$output  .= '<div class="nexuscontent-section__item"><dt>' . $question . '</dt><dd>' . $answer . '</dd></div>';
				continue;
			}

			$primary = '';
			foreach ( array( 'heading', 'value', 'quote', 'name', 'label' ) as $key ) {
				if ( isset( $item[ $key ] ) && is_scalar( $item[ $key ] ) ) {
					$primary = (string) $item[ $key ];
					break;
				}
			}

			$output .= '<li class="nexuscontent-section__item">';
			$output .= '' !== $primary ? '<strong>' . esc_html( $primary ) . '</strong>' : '';
			if ( isset( $item['body'] ) ) {
				$output .= wp_kses_post( wpautop( (string) $item['body'] ) );
			} elseif ( isset( $item['description'] ) ) {
				$output .= wp_kses_post( wpautop( (string) $item['description'] ) );
			}
			$output .= self::render_media( isset( $item['image'] ) ? $item['image'] : ( $item['logo'] ?? array() ) );
			$output .= self::render_link(
				isset( $item['url'] ) ? array(
					'url'   => $item['url'],
					'label' => $primary,
				) : array()
			);
			$output .= '</li>';
		}

		return $output . '</' . $tag . '>';
	}

	/**
	 * @param mixed $images Gallery images.
	 * @return string
	 */
	private static function render_gallery( $images ) {
		if ( ! is_array( $images ) || empty( $images ) ) {
			return '';
		}

		$output = '<div class="nexuscontent-section__gallery">';
		foreach ( $images as $image ) {
			$output .= self::render_media( $image );
		}
		return $output . '</div>';
	}

	/**
	 * Embed output is deterministic and allowlisted for every request.
	 *
	 * @param string $embed Embed markup.
	 * @return string
	 */
	private static function sanitize_embed( $embed ) {
		return Contract::sanitize_embed( (string) $embed );
	}
}
