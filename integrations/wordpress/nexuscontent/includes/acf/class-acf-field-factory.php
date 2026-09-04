<?php
/**
 * ACF field definitions shared by fixed fields, flexible layouts, and ACF blocks.
 *
 * @package NexusContent
 */

namespace NexusContent\Companion;

defined( 'ABSPATH' ) || exit;

final class ACF_Field_Factory {
	/**
	 * @param string               $type         Section type.
	 * @param array<string, bool>  $field_types  Available optional field types.
	 * @param array<int, string>   $limitations  Discovered limitations.
	 * @return array<int, array<string, mixed>>|null
	 */
	public static function fields_for( $type, $field_types, &$limitations, $context = 'section' ) {
		$type   = str_replace( '-', '_', (string) $type );
		$fields = array();

		$definitions = self::definition( $type );
		if ( empty( $definitions ) ) {
			// Custom section types registered through nexuscontent_section_definitions
			// have no built-in field map; derive ACF fields from the registry definition.
			$definitions = self::generic_fields( $type, $limitations );
		}

		foreach ( $definitions as $name => $definition ) {
			$field = self::field( $type, $name, $definition, $field_types, $limitations, $context );
			if ( null === $field ) {
				// Fixed fields degrade gracefully: an unavailable optional field
				// (for example the hero/cta buttons repeater on ACF Free) is
				// skipped while the remaining text and image fields still register.
				// Flexible layouts and blocks omit the whole section instead.
				if ( 'fixed' !== $context ) {
					return null;
				}
				continue;
			}
			$fields[] = $field;
		}

		return $fields;
	}

	/**
	 * @param string              $type        Section type.
	 * @param array<string, bool> $field_types Available field types.
	 * @param array<int, string>  $limitations Discovered limitations.
	 * @return array<string, mixed>|null
	 */
	public static function layout_for( $type, $field_types, &$limitations ) {
		$type   = str_replace( '-', '_', (string) $type );
		$fields = self::fields_for( $type, $field_types, $limitations, 'flexible' );
		if ( null === $fields ) {
			return null;
		}

		return array(
			'key'        => 'layout_nc_' . $type,
			'name'       => $type,
			'label'      => self::label( $type ),
			'display'    => 'block',
			'sub_fields' => $fields,
		);
	}

	/**
	 * @param string $type Section type.
	 * @return string
	 */
	public static function label( $type ) {
		return ( new Section_Registry() )->label( (string) $type );
	}

	/**
	 * Conceptual section fields. Definitions remain filterable at the loader boundary.
	 *
	 * @param string $type Section type.
	 * @return array<string, array<string, mixed>>
	 */
	private static function definition( $type ) {
		$section_id      = array(
			'type'         => 'text',
			'label'        => __( 'Section ID', 'nexuscontent' ),
			'instructions' => __( 'Optional stable identifier used in normalized output.', 'nexuscontent' ),
			'wrapper'      => array( 'width' => '33' ),
		);
		$variant         = array(
			'type'         => 'text',
			'label'        => __( 'Variant', 'nexuscontent' ),
			'instructions' => __( 'Optional variant used in normalized output.', 'nexuscontent' ),
			'wrapper'      => array( 'width' => '33' ),
		);
		$section_id_half = array_merge( $section_id, array( 'wrapper' => array( 'width' => '50' ) ) );
		$variant_half    = array_merge( $variant, array( 'wrapper' => array( 'width' => '50' ) ) );
		$map             = array(
			'hero'         => array(
				'section_id' => $section_id,
				'variant'    => $variant,
				'eyebrow'    => array(
					'type'    => 'text',
					'label'   => __( 'Eyebrow', 'nexuscontent' ),
					'wrapper' => array( 'width' => '33' ),
				),
				'heading'    => array(
					'type'    => 'text',
					'label'   => __( 'Heading', 'nexuscontent' ),
					'wrapper' => array( 'width' => '67' ),
				),
				'body'       => array(
					'type'  => 'textarea',
					'label' => __( 'Body', 'nexuscontent' ),
					'rows'  => 2,
				),
				'image'      => array(
					'type'    => 'image',
					'label'   => __( 'Image', 'nexuscontent' ),
					'wrapper' => array( 'width' => '50' ),
				),
				'buttons'    => array(
					'type'       => 'repeater',
					'label'      => __( 'Buttons', 'nexuscontent' ),
					'sub_fields' => self::button_fields(),
				),
			),
			'intro'        => array(
				'section_id'     => $section_id,
				'variant'        => $variant,
				'eyebrow'        => array(
					'type'    => 'text',
					'label'   => __( 'Eyebrow', 'nexuscontent' ),
					'wrapper' => array( 'width' => '33' ),
				),
				'heading'        => array(
					'type'    => 'text',
					'label'   => __( 'Heading', 'nexuscontent' ),
					'wrapper' => array( 'width' => '67' ),
				),
				'body'           => array(
					'type'  => 'textarea',
					'label' => __( 'Body', 'nexuscontent' ),
					'rows'  => 2,
				),
				'image'          => array(
					'type'    => 'image',
					'label'   => __( 'Image', 'nexuscontent' ),
					'wrapper' => array( 'width' => '50' ),
				),
				'image_position' => array(
					'type'    => 'select',
					'label'   => __( 'Image position', 'nexuscontent' ),
					'wrapper' => array( 'width' => '50' ),
					'choices' => array(
						'left'  => __( 'Left', 'nexuscontent' ),
						'right' => __( 'Right', 'nexuscontent' ),
					),
				),
			),
			'rich_text'    => array(
				'section_id' => $section_id_half,
				'variant'    => $variant_half,
				'heading'    => array(
					'type'  => 'text',
					'label' => __( 'Heading', 'nexuscontent' ),
				),
				'body'       => array(
					'type'         => 'wysiwyg',
					'label'        => __( 'Body', 'nexuscontent' ),
					'toolbar'      => 'basic',
					'media_upload' => 0,
				),
			),
			'image_text'   => array(
				'section_id'     => $section_id,
				'variant'        => $variant,
				'eyebrow'        => array(
					'type'    => 'text',
					'label'   => __( 'Eyebrow', 'nexuscontent' ),
					'wrapper' => array( 'width' => '33' ),
				),
				'heading'        => array(
					'type'    => 'text',
					'label'   => __( 'Heading', 'nexuscontent' ),
					'wrapper' => array( 'width' => '67' ),
				),
				'body'           => array(
					'type'  => 'textarea',
					'label' => __( 'Body', 'nexuscontent' ),
					'rows'  => 2,
				),
				'image'          => array(
					'type'    => 'image',
					'label'   => __( 'Image', 'nexuscontent' ),
					'wrapper' => array( 'width' => '50' ),
				),
				'image_position' => array(
					'type'    => 'select',
					'label'   => __( 'Image position', 'nexuscontent' ),
					'wrapper' => array( 'width' => '50' ),
					'choices' => array(
						'left'  => __( 'Left', 'nexuscontent' ),
						'right' => __( 'Right', 'nexuscontent' ),
					),
				),
				'buttons'        => array(
					'type'       => 'repeater',
					'label'      => __( 'Buttons', 'nexuscontent' ),
					'sub_fields' => self::button_fields(),
				),
			),
			'features'     => array(
				'section_id' => $section_id,
				'variant'    => $variant,
				'eyebrow'    => array(
					'type'    => 'text',
					'label'   => __( 'Eyebrow', 'nexuscontent' ),
					'wrapper' => array( 'width' => '33' ),
				),
				'heading'    => array(
					'type'    => 'text',
					'label'   => __( 'Heading', 'nexuscontent' ),
					'wrapper' => array( 'width' => '67' ),
				),
				'body'       => array(
					'type'  => 'textarea',
					'label' => __( 'Body', 'nexuscontent' ),
					'rows'  => 2,
				),
				'items'      => array(
					'type'       => 'repeater',
					'label'      => __( 'Features', 'nexuscontent' ),
					'sub_fields' => self::item_fields( 'feature' ),
				),
			),
			'statistics'   => array(
				'section_id' => $section_id,
				'variant'    => $variant,
				'eyebrow'    => array(
					'type'    => 'text',
					'label'   => __( 'Eyebrow', 'nexuscontent' ),
					'wrapper' => array( 'width' => '33' ),
				),
				'heading'    => array(
					'type'    => 'text',
					'label'   => __( 'Heading', 'nexuscontent' ),
					'wrapper' => array( 'width' => '67' ),
				),
				'items'      => array(
					'type'       => 'repeater',
					'label'      => __( 'Statistics', 'nexuscontent' ),
					'sub_fields' => self::item_fields( 'statistic' ),
				),
			),
			'testimonials' => array(
				'section_id' => $section_id,
				'variant'    => $variant,
				'eyebrow'    => array(
					'type'    => 'text',
					'label'   => __( 'Eyebrow', 'nexuscontent' ),
					'wrapper' => array( 'width' => '33' ),
				),
				'heading'    => array(
					'type'    => 'text',
					'label'   => __( 'Heading', 'nexuscontent' ),
					'wrapper' => array( 'width' => '67' ),
				),
				'items'      => array(
					'type'       => 'repeater',
					'label'      => __( 'Testimonials', 'nexuscontent' ),
					'sub_fields' => self::item_fields( 'testimonial' ),
				),
			),
			'gallery'      => array(
				'section_id' => $section_id,
				'variant'    => $variant,
				'eyebrow'    => array(
					'type'    => 'text',
					'label'   => __( 'Eyebrow', 'nexuscontent' ),
					'wrapper' => array( 'width' => '33' ),
				),
				'heading'    => array(
					'type'    => 'text',
					'label'   => __( 'Heading', 'nexuscontent' ),
					'wrapper' => array( 'width' => '67' ),
				),
				'images'     => array(
					'type'          => 'gallery',
					'label'         => __( 'Images', 'nexuscontent' ),
					'return_format' => 'id',
				),
			),
			'cta'          => array(
				'section_id'       => $section_id_half,
				'variant'          => $variant_half,
				'heading'          => array(
					'type'  => 'text',
					'label' => __( 'Heading', 'nexuscontent' ),
				),
				'body'             => array(
					'type'  => 'textarea',
					'label' => __( 'Body', 'nexuscontent' ),
					'rows'  => 2,
				),
				'buttons'          => array(
					'type'       => 'repeater',
					'label'      => __( 'Buttons', 'nexuscontent' ),
					'sub_fields' => self::button_fields(),
				),
				'background_image' => array(
					'type'    => 'image',
					'label'   => __( 'Background image', 'nexuscontent' ),
					'wrapper' => array( 'width' => '50' ),
				),
			),
			'faq'          => array(
				'section_id' => $section_id,
				'variant'    => $variant,
				'eyebrow'    => array(
					'type'    => 'text',
					'label'   => __( 'Eyebrow', 'nexuscontent' ),
					'wrapper' => array( 'width' => '33' ),
				),
				'heading'    => array(
					'type'    => 'text',
					'label'   => __( 'Heading', 'nexuscontent' ),
					'wrapper' => array( 'width' => '67' ),
				),
				'items'      => array(
					'type'       => 'repeater',
					'label'      => __( 'Questions', 'nexuscontent' ),
					'sub_fields' => self::item_fields( 'faq' ),
				),
			),
			'logo_grid'    => array(
				'section_id' => $section_id,
				'variant'    => $variant,
				'eyebrow'    => array(
					'type'    => 'text',
					'label'   => __( 'Eyebrow', 'nexuscontent' ),
					'wrapper' => array( 'width' => '33' ),
				),
				'heading'    => array(
					'type'    => 'text',
					'label'   => __( 'Heading', 'nexuscontent' ),
					'wrapper' => array( 'width' => '67' ),
				),
				'items'      => array(
					'type'       => 'repeater',
					'label'      => __( 'Logos', 'nexuscontent' ),
					'sub_fields' => self::item_fields( 'logo' ),
				),
			),
			'form_embed'   => array(
				'section_id' => $section_id_half,
				'variant'    => $variant_half,
				'heading'    => array(
					'type'  => 'text',
					'label' => __( 'Heading', 'nexuscontent' ),
				),
				'provider'   => array(
					'type'    => 'text',
					'label'   => __( 'Provider', 'nexuscontent' ),
					'wrapper' => array( 'width' => '50' ),
				),
				'form_id'    => array(
					'type'    => 'text',
					'label'   => __( 'Form ID', 'nexuscontent' ),
					'wrapper' => array( 'width' => '50' ),
				),
				'embed_code' => array(
					'type'         => 'textarea',
					'label'        => __( 'Embed code', 'nexuscontent' ),
					'instructions' => __( 'Only trusted embed markup should be used. WordPress capability and KSES rules apply.', 'nexuscontent' ),
					'rows'         => 2,
				),
			),
		);

		return isset( $map[ $type ] ) ? $map[ $type ] : array();
	}

	/**
	 * ACF field definitions for a custom section type registered through the
	 * nexuscontent_section_definitions filter. Fields whose type cannot be
	 * represented with ACF core field types are skipped with a limitation so
	 * normalized output never invents keys. Consumers needing richer layouts
	 * can register them through nexuscontent_acf_layout_definitions instead.
	 *
	 * @param string             $type        Section type.
	 * @param array<int, string> &$limitations Discovered limitations.
	 * @return array<string, array<string, mixed>>
	 */
	private static function generic_fields( $type, &$limitations ) {
		$registry   = new Section_Registry();
		$definition = $registry->definitions()[ $type ] ?? array();
		$result     = array();
		$acf_types  = array(
			'string'   => 'text',
			'number'   => 'number',
			'boolean'  => 'true_false',
			'datetime' => 'date_time_picker',
			'media'    => 'image',
			'richText' => 'wysiwyg',
		);

		foreach ( (array) ( $definition['fields'] ?? array() ) as $field ) {
			$name  = is_string( $field['name'] ?? null ) ? $field['name'] : '';
			$ftype = is_string( $field['type'] ?? null ) ? $field['type'] : '';
			if ( '' === $name || '' === $ftype ) {
				continue;
			}
			$acf_type = $acf_types[ $ftype ] ?? null;
			if ( null === $acf_type ) {
				/* translators: 1: section label, 2: unsupported field type. */
				$limitations[] = sprintf( __( '%1$s field "%2$s" was skipped because ACF cannot represent the %3$s field type; consumers may register a layout through nexuscontent_acf_layout_definitions.', 'nexuscontent' ), self::label( $type ), $name, $ftype );
				continue;
			}

			$item = array(
				'type'  => $acf_type,
				'label' => ucwords( str_replace( '_', ' ', $name ) ),
			);
			if ( ! empty( $field['required'] ) ) {
				$item['required'] = true;
			}
			if ( array_key_exists( 'default', $field ) && ( is_scalar( $field['default'] ) || null === $field['default'] ) ) {
				$item['default_value'] = $field['default'];
			}
			$result[ $name ] = $item;
		}

		return $result;
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	private static function button_fields() {
		return array(
			array(
				'key'     => 'field_nc_buttons_label',
				'name'    => 'label',
				'label'   => __( 'Label', 'nexuscontent' ),
				'type'    => 'text',
				'wrapper' => array( 'width' => '33' ),
			),
			array(
				'key'          => 'field_nc_buttons_url',
				'name'         => 'url',
				'label'        => __( 'URL', 'nexuscontent' ),
				'type'         => 'text',
				'instructions' => __( 'Absolute (https://…) or root-relative (/…) URLs are accepted.', 'nexuscontent' ),
				'wrapper'      => array( 'width' => '67' ),
			),
			array(
				'key'     => 'field_nc_buttons_variant',
				'name'    => 'variant',
				'label'   => __( 'Style', 'nexuscontent' ),
				'type'    => 'select',
				'choices' => array(
					'primary'   => __( 'Primary', 'nexuscontent' ),
					'secondary' => __( 'Secondary', 'nexuscontent' ),
					'light'     => __( 'Light', 'nexuscontent' ),
				),
			),
		);
	}

	/**
	 * @param string $kind Item kind.
	 * @return array<int, array<string, mixed>>
	 */
	private static function item_fields( $kind ) {
		$map    = array(
			'feature'     => array(
				'title'       => 'text',
				'description' => 'textarea',
				'points'      => 'repeater',
				'thumbnail'   => 'image',
			),
			'statistic'   => array(
				'value'       => 'text',
				'label'       => 'text',
				'description' => 'textarea',
			),
			'testimonial' => array(
				'quote'  => 'textarea',
				'author' => 'text',
				'avatar' => 'image',
			),
			'faq'         => array(
				'question' => 'text',
				// 'answer' is a plain text area (matching the Gutenberg block and Git
				// content) so consumer templates render it as escaped text, not HTML.
				'answer'   => 'textarea',
			),
			'logo'        => array(
				'name'  => 'text',
				'image' => 'image',
			),
		);
		$fields = array();

		$widths = array(
			'feature'     => array(
				'title'       => '33',
				'description' => '33',
				'points'      => '23',
				'thumbnail'   => '10',
			),
			'statistic'   => array(
				'value' => '50',
				'label' => '50',
			),
			'testimonial' => array(
				'quote'  => '66',
				'author' => '23',
				'avatar' => '10',
			),
			'logo'        => array(
				'name'  => '80',
				'image' => '20',
			),
		);

		foreach ( $map[ $kind ] as $name => $type ) {
			$field = array(
				'key'   => 'field_nc_item_' . $kind . '_' . $name,
				'name'  => $name,
				'label' => ucwords( str_replace( '_', ' ', $name ) ),
				'type'  => $type,
			);
			if ( 'textarea' === $type ) {
				$field['rows'] = 2;
			}
			if ( isset( $widths[ $kind ][ $name ] ) ) {
				$field['wrapper'] = array( 'width' => $widths[ $kind ][ $name ] );
			}
			if ( 'logo' === $kind && 'name' === $name ) {
				$field['label']        = __( 'Label', 'nexuscontent' );
				$field['instructions'] = __( 'Optional. Displayed alongside the logo image.', 'nexuscontent' );
			}
			if ( 'logo' === $kind && 'image' === $name ) {
				$field['instructions'] = __( 'The logo image.', 'nexuscontent' );
			}
			if ( 'feature' === $kind && 'points' === $name ) {
				$field['label']      = __( 'Points', 'nexuscontent' );
				$field['sub_fields'] = array(
					array(
						'key'   => 'field_nc_item_feature_points_text',
						'name'  => 'text',
						'label' => __( 'Point', 'nexuscontent' ),
						'type'  => 'text',
					),
				);
			}
			if ( 'image' === $type ) {
				$field['return_format'] = 'id';
				$field['preview_size']  = 'medium';
				$field['library']       = 'all';
			}
			$fields[] = $field;
		}

		return $fields;
	}

	/**
	 * @param string               $section      Section type.
	 * @param string               $name         Field name.
	 * @param array<string, mixed> $definition   Field definition.
	 * @param array<string, bool>  $field_types  Available fields.
	 * @param array<int, string>   $limitations  Limitations.
	 * @return array<string, mixed>|null
	 */
	private static function field( $section, $name, $definition, $field_types, &$limitations, $context ) {
		$type = $definition['type'];
		if ( in_array( $type, array( 'repeater', 'gallery' ), true ) && empty( $field_types[ $type ] ) ) {
			if ( 'fixed' === $context ) {
				/* translators: 1: field name, 2: section label, 3: unavailable ACF field type. */
				$limitations[] = sprintf( __( 'The "%1$s" field in the %2$s section was skipped because the %3$s field type is unavailable in the active ACF edition.', 'nexuscontent' ), $name, self::label( $section ), $type );
			} else {
				/* translators: 1: section label, 2: unavailable ACF field type. */
				$limitations[] = sprintf( __( 'The %1$s section was omitted because the %2$s field type is unavailable in the active ACF edition.', 'nexuscontent' ), self::label( $section ), $type );
			}
			return null;
		}

		$field = array_merge(
			$definition,
			array(
				'key'  => 'field_nc_' . sanitize_key( $context ) . '_' . str_replace( '-', '_', $section ) . '_' . $name,
				'name' => $name,
			)
		);

		if ( 'image' === $type ) {
			$field['return_format'] = 'id';
			$field['preview_size']  = 'medium';
			$field['library']       = 'all';
		}

		if ( isset( $field['sub_fields'] ) && is_array( $field['sub_fields'] ) ) {
			foreach ( $field['sub_fields'] as $index => $sub_field ) {
				if ( is_array( $sub_field ) && isset( $sub_field['name'] ) ) {
					$field['sub_fields'][ $index ]['key'] = 'field_nc_' . sanitize_key( $context ) . '_' . str_replace( '-', '_', $section ) . '_item_' . sanitize_key( $sub_field['name'] );
				}
			}
		}

		return $field;
	}
}
