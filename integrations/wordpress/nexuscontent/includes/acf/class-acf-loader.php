<?php
/**
 * Capability-safe ACF integration.
 *
 * @package NexusContent
 */

namespace NexusContent\Companion;

defined( 'ABSPATH' ) || exit;

final class ACF_Loader {
	/** @var array<int, string> */
	private $limitations = array();

	/** @var Section_Registry */
	private $registry;

	public function __construct( Section_Registry $registry ) {
		$this->registry = $registry;
	}

	/** Register hooks without making ACF a plugin requirement. */
	public function register() {
		add_action( 'acf/init', array( $this, 'initialize' ), 20 );
		add_action( 'admin_notices', array( $this, 'render_limitations_notice' ) );
		add_filter( 'acf/location/rule_types', array( $this, 'register_location_rule_type' ) );
		add_filter( 'acf/location/rule_values/nexus_editor_mode', array( $this, 'register_location_rule_values' ) );
		add_filter( 'acf/location/rule_match/nexus_editor_mode', array( $this, 'match_editor_mode' ), 10, 3 );
	}

	/** Register integrations supported by the active ACF edition. */
	public function initialize() {
		if ( ! function_exists( 'acf_add_local_field_group' ) ) {
			return;
		}
		if ( defined( 'ACF_VERSION' ) && version_compare( (string) ACF_VERSION, '6.2', '<' ) ) {
			$this->limitations[] = __( 'NexusContent requires ACF 6.2 or newer; no ACF fields or blocks were registered.', 'nexuscontent' );
			do_action( 'nexuscontent_acf_limitations', $this->limitations );
			return;
		}

		$field_types = array(
			'repeater'         => $this->field_type_available( 'repeater' ),
			'gallery'          => $this->field_type_available( 'gallery' ),
			'flexible_content' => $this->field_type_available( 'flexible_content' ),
		);

		$this->register_fixed_fields();

		if ( $field_types['flexible_content'] ) {
			$this->register_flexible_content( $field_types );
		} else {
			$this->limitations[] = __( 'ACF Flexible Content sections are unavailable because the flexible_content field type is not registered.', 'nexuscontent' );
		}

		if ( function_exists( 'acf_register_block_type' ) ) {
			$this->register_acf_blocks( $field_types );
		}

		$this->limitations = array_values( array_unique( array_filter( $this->limitations ) ) );
		do_action( 'nexuscontent_acf_limitations', $this->limitations );
	}

	/** Register the ACF Free-compatible fixed section fields. */
	private function register_fixed_fields() {
		$field_types = array(
			'repeater'         => false,
			'gallery'          => false,
			'flexible_content' => false,
		);
		$definitions = array();
		foreach ( $this->registry->fixed_types() as $type ) {
			$fields        = ACF_Field_Factory::fields_for( $type, $field_types, $this->limitations, 'fixed' );
			$definitions[] = array(
				'key'           => 'field_nc_fixed_' . $type . '_enabled',
				'name'          => $type . '_enabled',
				/* translators: %s: section label. */
				'label'         => sprintf( __( 'Enable %s', 'nexuscontent' ), ACF_Field_Factory::label( $type ) ),
				'type'          => 'true_false',
				'ui'            => 1,
				'default_value' => 0,
			);
			foreach ( is_array( $fields ) ? $fields : array() as $field ) {
				if ( ! is_array( $field ) || ! is_string( $field['name'] ?? null ) ) {
					continue;
				}
				$field['key']               = 'field_nc_fixed_' . $type . '_' . $field['name'];
				$field['name']              = $type . '_' . $field['name'];
				$field['conditional_logic'] = array(
					array(
						array(
							'field'    => 'field_nc_fixed_' . $type . '_enabled',
							'operator' => '==',
							'value'    => '1',
						),
					),
				);
				$definitions[]              = $field;
			}
		}

		$definitions = apply_filters( 'nexuscontent_fixed_field_definitions', $definitions );
		acf_add_local_field_group(
			array(
				'key'                   => 'group_nc_fixed_page_sections',
				'title'                 => __( 'NexusContent fixed sections', 'nexuscontent' ),
				'fields'                => is_array( $definitions ) ? $definitions : array(),
				'location'              => $this->section_mode_location( 'acf_fixed' ),
				'instruction_placement' => 'label',
				'description'           => __( 'Fixed fields provide a predictable Hero, Introduction, and Call to Action structure. Existing block or flexible content is not removed when modes change.', 'nexuscontent' ),
				'show_in_rest'          => 1,
			)
		);
	}

	/**
	 * @param array<string, bool> $field_types Available optional field types.
	 */
	private function register_flexible_content( $field_types ) {
		$layouts = array();
		foreach ( array_keys( $this->registry->definitions() ) as $type ) {
			$layout = ACF_Field_Factory::layout_for( $type, $field_types, $this->limitations );
			if ( null !== $layout ) {
				$layouts[ $type ] = $layout;
			}
		}

		$layouts = apply_filters( 'nexuscontent_acf_layout_definitions', $layouts, $field_types );
		acf_add_local_field_group(
			array(
				'key'          => 'group_nc_flexible_sections',
				'title'        => __( 'NexusContent sections', 'nexuscontent' ),
				'fields'       => array(
					array(
						'key'          => 'field_nc_nexus_sections',
						'name'         => 'nexus_sections',
						'label'        => __( 'Sections', 'nexuscontent' ),
						'instructions' => __( 'Add and arrange supported NexusContent sections. Layouts requiring unavailable ACF field types are omitted.', 'nexuscontent' ),
						'type'         => 'flexible_content',
						'layouts'      => is_array( $layouts ) ? $layouts : array(),
						'button_label' => __( 'Add section', 'nexuscontent' ),
					),
				),
				'location'     => $this->section_mode_location( 'acf_flexible' ),
				'show_in_rest' => 1,
			)
		);
	}

	/**
	 * @param array<string, bool> $field_types Available optional field types.
	 */
	private function register_acf_blocks( $field_types ) {
		foreach ( array_keys( $this->registry->definitions() ) as $type ) {
			if ( ! $this->implementation_enabled( $type, 'acf' ) ) {
				continue;
			}

			$source_name = Section_Registry::SOURCE_NAMES[ $type ];
			$name        = 'acf/' . $source_name;
			if ( class_exists( '\WP_Block_Type_Registry' ) && \WP_Block_Type_Registry::get_instance()->is_registered( $name ) ) {
				continue;
			}

			$fields = ACF_Field_Factory::fields_for( $type, $field_types, $this->limitations, 'block' );
			if ( null === $fields ) {
				continue;
			}

			acf_register_block_type(
				array(
					'name'            => $source_name,
					'title'           => ACF_Field_Factory::label( $type ),
					/* translators: %s: section label. */
					'description'     => sprintf( __( 'ACF implementation of the NexusContent %s section.', 'nexuscontent' ), ACF_Field_Factory::label( $type ) ),
					'category'        => 'nexuscontent',
					'icon'            => 'layout',
					'mode'            => 'preview',
					'supports'        => array(
						'align'  => false,
						'anchor' => true,
						'jsx'    => false,
					),
					'render_callback' => static function () use ( $type ) {
						$values = function_exists( 'get_fields' ) ? get_fields() : array();
						echo Block_Normalizer::render( $type, is_array( $values ) ? $values : array() ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Renderer escapes by field context.
					},
				)
			);

			acf_add_local_field_group(
				array(
					'key'          => 'group_nc_acf_block_' . str_replace( '-', '_', $type ),
					'title'        => ACF_Field_Factory::label( $type ),
					'fields'       => $fields,
					'location'     => array(
						array(
							array(
								'param'    => 'block',
								'operator' => '==',
								'value'    => $name,
							),
						),
					),
					'show_in_rest' => 1,
				)
			);
		}
	}

	/**
	 * @param string $type Field type.
	 * @return bool
	 */
	private function field_type_available( $type ) {
		return function_exists( 'acf_get_field_type' ) && (bool) acf_get_field_type( $type );
	}

	/**
	 * Location rules matching pages and posts whose editor mode is $mode.
	 *
	 * @param string $mode Editor mode.
	 * @return array<int, array<int, array<string, string>>>
	 */
	private function section_mode_location( $mode ) {
		return array(
			array(
				array(
					'param'    => 'post_type',
					'operator' => '==',
					'value'    => 'page',
				),
				array(
					'param'    => 'nexus_editor_mode',
					'operator' => '==',
					'value'    => $mode,
				),
			),
			array(
				array(
					'param'    => 'post_type',
					'operator' => '==',
					'value'    => 'post',
				),
				array(
					'param'    => 'nexus_editor_mode',
					'operator' => '==',
					'value'    => $mode,
				),
			),
		);
	}

	/**
	 * @param array<string, mixed> $choices Rule groups.
	 * @return array<string, mixed>
	 */
	public function register_location_rule_type( $choices ) {
		$choices[ __( 'NexusContent', 'nexuscontent' ) ]['nexus_editor_mode'] = __( 'Editor mode', 'nexuscontent' );
		return $choices;
	}

	/**
	 * @return array<string, string>
	 */
	public function register_location_rule_values() {
		return array(
			'gutenberg'    => __( 'Gutenberg', 'nexuscontent' ),
			'acf_flexible' => __( 'ACF Flexible Content', 'nexuscontent' ),
			'acf_fixed'    => __( 'ACF Fixed Fields', 'nexuscontent' ),
		);
	}

	/**
	 * @param bool                 $current_match Existing match.
	 * @param array<string, mixed> $rule    Location rule.
	 * @param array<string, mixed> $options Screen options.
	 * @return bool
	 */
	public function match_editor_mode( $current_match, $rule, $options ) {
		$post_id = isset( $options['post_id'] ) ? absint( $options['post_id'] ) : 0;
		$value   = $post_id ? get_post_meta( $post_id, 'nexus_editor_mode', true ) : 'gutenberg';
		$value   = $value ? $value : 'gutenberg';
		$equal   = isset( $rule['value'] ) && $value === $rule['value'];

		return isset( $rule['operator'] ) && '!=' === $rule['operator'] ? ! $equal : $equal;
	}

	/** Display capability limitations only to users configuring page or post content. */
	public function render_limitations_notice() {
		if ( empty( $this->limitations ) || ! ( current_user_can( 'edit_pages' ) || current_user_can( 'edit_posts' ) ) ) {
			return;
		}

		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ! in_array( $screen->post_type, array( 'page', 'post' ), true ) ) {
			return;
		}

		echo '<div class="notice notice-info"><p><strong>' . esc_html__( 'NexusContent ACF capabilities', 'nexuscontent' ) . '</strong></p><ul>';
		foreach ( $this->limitations as $limitation ) {
			echo '<li>' . esc_html( $limitation ) . '</li>';
		}
		echo '</ul></div>';
	}

	/**
	 * @param string $type           Block type.
	 * @param string $implementation Implementation.
	 * @return bool
	 */
	private function implementation_enabled( $type, $implementation ) {
		$selection = apply_filters( 'nexuscontent_block_implementations', 'native', $type );
		if ( is_array( $selection ) && isset( $selection[ $type ] ) ) {
			$selection = $selection[ $type ];
		}
		if ( 'both' === $selection ) {
			return true;
		}
		return is_array( $selection ) ? in_array( $implementation, $selection, true ) : $implementation === $selection;
	}
}
