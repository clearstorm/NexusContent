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

		foreach ( self::definition( $type ) as $name => $definition ) {
			$field = self::field( $type, $name, $definition, $field_types, $limitations, $context );
			if ( null === $field ) {
				return null;
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
		$section_id = array(
			'type'         => 'text',
			'label'        => __( 'Section ID', 'nexuscontent' ),
			'instructions' => __( 'Optional stable identifier used in normalized output.', 'nexuscontent' ),
		);
		$variant    = array(
			'type'  => 'text',
			'label' => __( 'Variant', 'nexuscontent' ),
		);
		$theme      = array(
			'type'  => 'text',
			'label' => __( 'Theme', 'nexuscontent' ),
		);
		$map        = array(
			'hero'         => array(
				'section_id'             => $section_id,
				'variant'                => $variant,
				'eyebrow'                => array(
					'type'  => 'text',
					'label' => __( 'Eyebrow', 'nexuscontent' ),
				),
				'heading'                => array(
					'type'  => 'text',
					'label' => __( 'Heading', 'nexuscontent' ),
				),
				'body'                   => array(
					'type'  => 'textarea',
					'label' => __( 'Body', 'nexuscontent' ),
				),
				'image'                  => array(
					'type'  => 'image',
					'label' => __( 'Image', 'nexuscontent' ),
				),
				'primary_action_label'   => array(
					'type'  => 'text',
					'label' => __( 'Primary action label', 'nexuscontent' ),
				),
				'primary_action_url'     => array(
					'type'  => 'url',
					'label' => __( 'Primary action URL', 'nexuscontent' ),
				),
				'secondary_action_label' => array(
					'type'  => 'text',
					'label' => __( 'Secondary action label', 'nexuscontent' ),
				),
				'secondary_action_url'   => array(
					'type'  => 'url',
					'label' => __( 'Secondary action URL', 'nexuscontent' ),
				),
				'theme'                  => $theme,
			),
			'intro'        => array(
				'section_id'     => $section_id,
				'variant'        => $variant,
				'eyebrow'        => array(
					'type'  => 'text',
					'label' => __( 'Eyebrow', 'nexuscontent' ),
				),
				'heading'        => array(
					'type'  => 'text',
					'label' => __( 'Heading', 'nexuscontent' ),
				),
				'body'           => array(
					'type'  => 'textarea',
					'label' => __( 'Body', 'nexuscontent' ),
				),
				'image'          => array(
					'type'  => 'image',
					'label' => __( 'Image', 'nexuscontent' ),
				),
				'image_position' => array(
					'type'    => 'select',
					'label'   => __( 'Image position', 'nexuscontent' ),
					'choices' => array(
						'left'  => __( 'Left', 'nexuscontent' ),
						'right' => __( 'Right', 'nexuscontent' ),
					),
				),
				'theme'          => $theme,
			),
			'rich_text'    => array(
				'section_id' => $section_id,
				'variant'    => $variant,
				'heading'    => array(
					'type'  => 'text',
					'label' => __( 'Heading', 'nexuscontent' ),
				),
				'body'       => array(
					'type'  => 'wysiwyg',
					'label' => __( 'Body', 'nexuscontent' ),
				),
				'theme'      => $theme,
			),
			'image_text'   => array(
				'section_id'     => $section_id,
				'variant'        => $variant,
				'eyebrow'        => array(
					'type'  => 'text',
					'label' => __( 'Eyebrow', 'nexuscontent' ),
				),
				'heading'        => array(
					'type'  => 'text',
					'label' => __( 'Heading', 'nexuscontent' ),
				),
				'body'           => array(
					'type'  => 'textarea',
					'label' => __( 'Body', 'nexuscontent' ),
				),
				'image'          => array(
					'type'  => 'image',
					'label' => __( 'Image', 'nexuscontent' ),
				),
				'image_position' => array(
					'type'    => 'select',
					'label'   => __( 'Image position', 'nexuscontent' ),
					'choices' => array(
						'left'  => __( 'Left', 'nexuscontent' ),
						'right' => __( 'Right', 'nexuscontent' ),
					),
				),
				'action_label'   => array(
					'type'  => 'text',
					'label' => __( 'Action label', 'nexuscontent' ),
				),
				'action_url'     => array(
					'type'  => 'url',
					'label' => __( 'Action URL', 'nexuscontent' ),
				),
				'theme'          => $theme,
			),
			'features'     => array(
				'section_id' => $section_id,
				'variant'    => $variant,
				'eyebrow'    => array(
					'type'  => 'text',
					'label' => __( 'Eyebrow', 'nexuscontent' ),
				),
				'heading'    => array(
					'type'  => 'text',
					'label' => __( 'Heading', 'nexuscontent' ),
				),
				'body'       => array(
					'type'  => 'textarea',
					'label' => __( 'Body', 'nexuscontent' ),
				),
				'items'      => array(
					'type'       => 'repeater',
					'label'      => __( 'Features', 'nexuscontent' ),
					'sub_fields' => self::item_fields( 'feature' ),
				),
				'theme'      => $theme,
			),
			'statistics'   => array(
				'section_id' => $section_id,
				'variant'    => $variant,
				'eyebrow'    => array(
					'type'  => 'text',
					'label' => __( 'Eyebrow', 'nexuscontent' ),
				),
				'heading'    => array(
					'type'  => 'text',
					'label' => __( 'Heading', 'nexuscontent' ),
				),
				'items'      => array(
					'type'       => 'repeater',
					'label'      => __( 'Statistics', 'nexuscontent' ),
					'sub_fields' => self::item_fields( 'statistic' ),
				),
				'theme'      => $theme,
			),
			'testimonials' => array(
				'section_id' => $section_id,
				'variant'    => $variant,
				'eyebrow'    => array(
					'type'  => 'text',
					'label' => __( 'Eyebrow', 'nexuscontent' ),
				),
				'heading'    => array(
					'type'  => 'text',
					'label' => __( 'Heading', 'nexuscontent' ),
				),
				'items'      => array(
					'type'       => 'repeater',
					'label'      => __( 'Testimonials', 'nexuscontent' ),
					'sub_fields' => self::item_fields( 'testimonial' ),
				),
				'theme'      => $theme,
			),
			'gallery'      => array(
				'section_id' => $section_id,
				'variant'    => $variant,
				'eyebrow'    => array(
					'type'  => 'text',
					'label' => __( 'Eyebrow', 'nexuscontent' ),
				),
				'heading'    => array(
					'type'  => 'text',
					'label' => __( 'Heading', 'nexuscontent' ),
				),
				'images'     => array(
					'type'          => 'gallery',
					'label'         => __( 'Images', 'nexuscontent' ),
					'return_format' => 'id',
				),
				'theme'      => $theme,
			),
			'cta'          => array(
				'section_id'             => $section_id,
				'variant'                => $variant,
				'heading'                => array(
					'type'  => 'text',
					'label' => __( 'Heading', 'nexuscontent' ),
				),
				'body'                   => array(
					'type'  => 'textarea',
					'label' => __( 'Body', 'nexuscontent' ),
				),
				'primary_action_label'   => array(
					'type'  => 'text',
					'label' => __( 'Primary action label', 'nexuscontent' ),
				),
				'primary_action_url'     => array(
					'type'  => 'url',
					'label' => __( 'Primary action URL', 'nexuscontent' ),
				),
				'secondary_action_label' => array(
					'type'  => 'text',
					'label' => __( 'Secondary action label', 'nexuscontent' ),
				),
				'secondary_action_url'   => array(
					'type'  => 'url',
					'label' => __( 'Secondary action URL', 'nexuscontent' ),
				),
				'background_image'       => array(
					'type'  => 'image',
					'label' => __( 'Background image', 'nexuscontent' ),
				),
				'theme'                  => $theme,
			),
			'faq'          => array(
				'section_id' => $section_id,
				'variant'    => $variant,
				'eyebrow'    => array(
					'type'  => 'text',
					'label' => __( 'Eyebrow', 'nexuscontent' ),
				),
				'heading'    => array(
					'type'  => 'text',
					'label' => __( 'Heading', 'nexuscontent' ),
				),
				'items'      => array(
					'type'       => 'repeater',
					'label'      => __( 'Questions', 'nexuscontent' ),
					'sub_fields' => self::item_fields( 'faq' ),
				),
				'theme'      => $theme,
			),
			'logo_grid'    => array(
				'section_id' => $section_id,
				'variant'    => $variant,
				'eyebrow'    => array(
					'type'  => 'text',
					'label' => __( 'Eyebrow', 'nexuscontent' ),
				),
				'heading'    => array(
					'type'  => 'text',
					'label' => __( 'Heading', 'nexuscontent' ),
				),
				'items'      => array(
					'type'       => 'repeater',
					'label'      => __( 'Logos', 'nexuscontent' ),
					'sub_fields' => self::item_fields( 'logo' ),
				),
				'theme'      => $theme,
			),
			'form_embed'   => array(
				'section_id' => $section_id,
				'variant'    => $variant,
				'heading'    => array(
					'type'  => 'text',
					'label' => __( 'Heading', 'nexuscontent' ),
				),
				'provider'   => array(
					'type'  => 'text',
					'label' => __( 'Provider', 'nexuscontent' ),
				),
				'form_id'    => array(
					'type'  => 'text',
					'label' => __( 'Form ID', 'nexuscontent' ),
				),
				'embed_code' => array(
					'type'         => 'textarea',
					'label'        => __( 'Embed code', 'nexuscontent' ),
					'instructions' => __( 'Only trusted embed markup should be used. WordPress capability and KSES rules apply.', 'nexuscontent' ),
				),
				'theme'      => $theme,
			),
		);

		return isset( $map[ $type ] ) ? $map[ $type ] : array();
	}

	/**
	 * @param string $kind Item kind.
	 * @return array<int, array<string, mixed>>
	 */
	private static function item_fields( $kind ) {
		$map    = array(
			'feature'     => array(
				'heading' => 'text',
				'body'    => 'textarea',
				'icon'    => 'text',
				'image'   => 'image',
				'url'     => 'url',
			),
			'statistic'   => array(
				'value'       => 'text',
				'label'       => 'text',
				'description' => 'textarea',
			),
			'testimonial' => array(
				'quote'        => 'textarea',
				'name'         => 'text',
				'role'         => 'text',
				'organisation' => 'text',
				'image'        => 'image',
			),
			'faq'         => array(
				'question' => 'text',
				'answer'   => 'wysiwyg',
			),
			'logo'        => array(
				'name' => 'text',
				'logo' => 'image',
				'url'  => 'url',
			),
		);
		$fields = array();

		foreach ( $map[ $kind ] as $name => $type ) {
			$field = array(
				'key'   => 'field_nc_item_' . $kind . '_' . $name,
				'name'  => $name,
				'label' => ucwords( str_replace( '_', ' ', $name ) ),
				'type'  => $type,
			);
			if ( 'logo' === $kind && 'name' === $name ) {
				$field['label']        = __( 'Label', 'nexuscontent' );
				$field['instructions'] = __( 'Optional. Displayed with the logo when both are supplied.', 'nexuscontent' );
			}
			if ( 'logo' === $kind && 'logo' === $name ) {
				$field['instructions'] = __( 'Optional. Each item may contain a label, a logo, or both.', 'nexuscontent' );
			}
			if ( 'image' === $type ) {
				$field['return_format'] = 'id';
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
			/* translators: 1: section label, 2: unavailable ACF field type. */
			$limitations[] = sprintf( __( '%1$s was skipped because the %2$s field type is unavailable.', 'nexuscontent' ), self::label( $section ), $type );
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
