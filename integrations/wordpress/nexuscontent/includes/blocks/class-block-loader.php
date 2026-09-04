<?php
/**
 * Native block registration and block-editor integration.
 *
 * @package NexusContent
 */

namespace NexusContent\Companion;

defined( 'ABSPATH' ) || exit;

final class Block_Loader {
	const SCRIPT_HANDLE  = 'nexuscontent-editor';
	const STYLE_HANDLE   = 'nexuscontent-editor';
	const PREVIEW_HANDLE = 'nexuscontent-preview';

	/** @var string */
	private $root;

	/** @var bool */
	private $assets_registered = false;

	/** @var Section_Registry */
	private $registry;
	private Capabilities $capabilities;

	public function __construct( Section_Registry $registry, ?Capabilities $capabilities = null ) {
		$this->root         = dirname( __DIR__, 2 );
		$this->registry     = $registry;
		$this->capabilities = $capabilities ?? new Capabilities( $registry );
	}

	/** Register WordPress hooks. */
	public function register() {
		add_filter( 'block_categories_all', array( $this, 'register_category' ), 10, 2 );
		add_action( 'init', array( $this, 'register_blocks' ), 20 );
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_document_settings' ) );
		foreach ( array( 'page', 'post' ) as $post_type ) {
			add_action( 'add_meta_boxes_' . $post_type, array( $this, 'remove_block_editor_fallback_meta_box' ), 100 );
		}
	}

	/**
	 * @param array<int, array<string, string>> $categories Existing categories.
	 * @return array<int, array<string, string>>
	 */
	public function register_category( $categories, $context = null ) {
		foreach ( $categories as $category ) {
			if ( isset( $category['slug'] ) && 'nexuscontent' === $category['slug'] ) {
				return $categories;
			}
		}

		array_unshift(
			$categories,
			array(
				'slug'  => 'nexuscontent',
				'title' => __( 'NexusContent', 'nexuscontent' ),
				'icon'  => 'layout',
			)
		);

		return $categories;
	}

	/** Register all enabled native blocks from their metadata directories. */
	public function register_blocks() {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}

		$this->register_assets();

		foreach ( array_keys( $this->registry->definitions() ) as $type ) {
			$source_name = Section_Registry::SOURCE_NAMES[ $type ];
			if ( ! $this->implementation_enabled( $type, 'native' ) ) {
				continue;
			}

			$path = $this->root . '/blocks/' . $source_name;
			if ( ! is_readable( $path . '/block.json' ) ||
				( class_exists( '\WP_Block_Type_Registry' ) && \WP_Block_Type_Registry::get_instance()->is_registered( 'nexuscontent/' . $source_name ) ) ) {
				continue;
			}

			register_block_type(
				$path,
				array(
					'render_callback' => static function ( $attributes ) use ( $type ) {
						return Block_Normalizer::render( $type, is_array( $attributes ) ? $attributes : array() );
					},
				)
			);
		}
	}

	/** Enqueue the page and post document settings panel. */
	public function enqueue_document_settings() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ! in_array( $screen->post_type, array( 'page', 'post' ), true ) || ! $screen->is_block_editor() ) {
			return;
		}

		$this->register_assets();
		wp_enqueue_script( self::SCRIPT_HANDLE );
		wp_enqueue_style( self::STYLE_HANDLE );
		$this->enqueue_preview_button();

		wp_localize_script(
			self::SCRIPT_HANDLE,
			'NexusContentEditorSettings',
			array(
				'metaKey'         => 'nexus_editor_mode',
				'nativeTypes'     => $this->enabled_native_types(),
				'enabledSections' => $this->settings_enabled_sections(),
				'previewBaseUrl'  => esc_url_raw( $this->root_url() . 'assets/previews/' ),
				'modes'           => array_values( $this->editor_mode_capabilities() ),
				'contentByMode'   => $this->content_by_mode(),
				'labels'          => array(
					'panel'       => __( 'NexusContent editor', 'nexuscontent' ),
					'description' => __( 'Choose how this content is structured. Changing mode never deletes existing content.', 'nexuscontent' ),
					'warning'     => __( 'This content is already authored in the current editor mode. Switching modes will leave that content stored but inactive. Continue?', 'nexuscontent' ),
				),
			)
		);
	}

	/** Remove only known classic fallback boxes when the block-editor panel is available. */
	public function remove_block_editor_fallback_meta_box() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ! $screen->is_block_editor() || ! in_array( $screen->post_type, array( 'page', 'post' ), true ) ) {
			return;
		}

		remove_meta_box( 'nexuscontent_editor_mode', $screen->post_type, 'side' );
		remove_meta_box( 'nexuscontent-editor-mode', $screen->post_type, 'side' );
	}

	/**
	 * Hyphenated block directory names for the canonical sections.
	 *
	 * @return array<int, string>
	 */
	public static function block_types() {
		$types = array_keys( ( new Section_Registry() )->definitions() );

		return array_map( static fn( string $type ): string => str_replace( '_', '-', $type ), $types );
	}

	/** Register shared handles once; block.json references the handles by name. */
	private function register_assets() {
		if ( $this->assets_registered ) {
			return;
		}

		$base_url     = $this->root_url();
		$version      = defined( 'NEXUSCONTENT_COMPANION_VERSION' ) ? NEXUSCONTENT_COMPANION_VERSION : '0.1.4';
		$dependencies = array( 'wp-api-fetch', 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-data', 'wp-plugins', 'wp-edit-post' );
		$asset_file   = $this->root . '/assets/build/editor.asset.php';
		if ( is_readable( $asset_file ) ) {
			$asset = require $asset_file;
			if ( is_array( $asset ) ) {
				if ( isset( $asset['dependencies'] ) && is_array( $asset['dependencies'] ) ) {
					$dependencies = array_values( array_unique( array_merge( $dependencies, array_filter( $asset['dependencies'], 'is_string' ) ) ) );
				}
				if ( isset( $asset['version'] ) && ( is_string( $asset['version'] ) || is_int( $asset['version'] ) ) ) {
					$version = (string) $asset['version'];
				}
			}
		}

		if ( ! wp_script_is( self::SCRIPT_HANDLE, 'registered' ) ) {
			wp_register_script(
				self::SCRIPT_HANDLE,
				$base_url . 'assets/build/editor.js',
				$dependencies,
				$version,
				true
			);
		}

		if ( ! wp_style_is( self::STYLE_HANDLE, 'registered' ) ) {
			wp_register_style( self::STYLE_HANDLE, $base_url . 'assets/build/editor.css', array( 'wp-edit-blocks' ), $version );
		}

		if ( ! wp_script_is( self::PREVIEW_HANDLE, 'registered' ) ) {
			wp_register_script(
				self::PREVIEW_HANDLE,
				$base_url . 'assets/build/preview.js',
				array( 'wp-api-fetch', 'wp-blocks', 'wp-element', 'wp-components', 'wp-data', 'wp-plugins', 'wp-edit-post' ),
				$version,
				true
			);
		}

		$this->assets_registered = true;
	}

	/** Enqueue the preview button with its localized settings. */
	private function enqueue_preview_button(): void {
		wp_enqueue_script( self::PREVIEW_HANDLE );

		wp_localize_script(
			self::PREVIEW_HANDLE,
			'NexusContentPreviewSettings',
			array(
				'restRoot'           => trailingslashit( rest_url( NEXUSCONTENT_COMPANION_REST_NAMESPACE ) ),
				'previewFrontendUrl' => $this->settings_preview_frontend_url(),
				'labels'             => array(
					'panel'        => __( 'Frontend preview', 'nexuscontent' ),
					'description'  => __( 'Open this content rendered by the consuming frontend.', 'nexuscontent' ),
					'button'       => __( 'Open frontend preview', 'nexuscontent' ),
					'fetchError'   => __( 'Could not create a preview token.', 'nexuscontent' ),
					'noPreviewUrl' => __( 'The frontend returned no preview URL.', 'nexuscontent' ),
					'noConfig'     => __( 'Set the Frontend preview URL in NexusContent settings to enable preview.', 'nexuscontent' ),
					'opened'       => __( 'Preview opened in a new tab.', 'nexuscontent' ),
				),
			)
		);
	}

	/** @return string */
	private function settings_preview_frontend_url(): string {
		$stored = get_option( 'nexuscontent_settings', array() );
		$stored = is_array( $stored ) ? $stored : array();
		return isset( $stored['preview_frontend_url'] ) ? esc_url_raw( (string) $stored['preview_frontend_url'] ) : '';
	}

	/**
	 * @return string
	 */
	private function root_url() {
		if ( defined( 'NEXUSCONTENT_COMPANION_URL' ) ) {
			return trailingslashit( NEXUSCONTENT_COMPANION_URL );
		}
		if ( defined( 'NEXUSCONTENT_COMPANION_FILE' ) ) {
			return plugin_dir_url( NEXUSCONTENT_COMPANION_FILE );
		}

		return trailingslashit( plugins_url( '', $this->root . '/nexuscontent.php' ) );
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	private function editor_mode_capabilities() {
		$modes = array(
			'gutenberg'    => array(
				'value'     => 'gutenberg',
				'label'     => __( 'Gutenberg', 'nexuscontent' ),
				'available' => $this->capabilities->supports_mode( Editor_Mode::GUTENBERG ),
				'reason'    => $this->capabilities->supports_mode( Editor_Mode::GUTENBERG ) ? '' : __( 'This post type does not support the block editor.', 'nexuscontent' ),
			),
			'acf_flexible' => array(
				'value'     => 'acf_flexible',
				'label'     => __( 'ACF Flexible Content', 'nexuscontent' ),
				'available' => $this->capabilities->supports_mode( Editor_Mode::ACF_FLEXIBLE ),
				'reason'    => $this->capabilities->supports_mode( Editor_Mode::ACF_FLEXIBLE ) ? '' : __( 'Requires ACF 6.2 or newer with Flexible Content.', 'nexuscontent' ),
			),
			'acf_fixed'    => array(
				'value'     => 'acf_fixed',
				'label'     => __( 'ACF Fixed Fields', 'nexuscontent' ),
				'available' => $this->capabilities->supports_mode( Editor_Mode::ACF_FIXED ),
				'reason'    => $this->capabilities->supports_mode( Editor_Mode::ACF_FIXED ) ? '' : __( 'Requires ACF 6.2 or newer.', 'nexuscontent' ),
			),
		);

		return (array) apply_filters( 'nexuscontent_editor_mode_capabilities', $modes );
	}

	/**
	 * Existing ACF values are not part of the block-editor store, so the server
	 * contributes only boolean presence signals to the mode-change warning.
	 *
	 * @return array<string, bool>
	 */
	private function content_by_mode() {
		$post_id = get_the_ID();
		$fixed   = false;
		foreach ( $this->fixed_field_keys() as $key ) {
			if ( $post_id && metadata_exists( 'post', $post_id, $key ) && '' !== get_post_meta( $post_id, $key, true ) ) {
				$fixed = true;
				break;
			}
		}

		$flexible = $post_id && metadata_exists( 'post', $post_id, 'nexus_sections' ) && '' !== get_post_meta( $post_id, 'nexus_sections', true );

		return (array) apply_filters(
			'nexuscontent_editor_mode_content_presence',
			array(
				'gutenberg'    => $post_id ? has_blocks( get_post_field( 'post_content', $post_id ) ) : false,
				'acf_flexible' => (bool) $flexible,
				'acf_fixed'    => $fixed,
			),
			$post_id
		);
	}

	/** @return array<int, string> */
	private function fixed_field_keys() {
		return $this->registry->fixed_field_keys();
	}

	/**
	 * @param string $type           Block type.
	 * @param string $implementation native or acf.
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

		if ( is_array( $selection ) ) {
			return in_array( $implementation, $selection, true ) || in_array( 'both', $selection, true );
		}

		return $implementation === $selection;
	}

	/** @return array<int, string> */
	private function enabled_native_types(): array {
		$from_settings = $this->settings_enabled_sections();
		return array_values(
			array_filter(
				Section_Registry::TYPES,
				fn( string $type ): bool => $this->implementation_enabled( $type, 'native' ) && in_array( $type, $from_settings, true )
			)
		);
	}

	/**
	 * Read the enabled sections from the plugin settings option.
	 *
	 * @return array<int, string>
	 */
	private function settings_enabled_sections(): array {
		$stored   = get_option( 'nexuscontent_settings', array() );
		$stored   = is_array( $stored ) ? $stored : array();
		$defaults = Section_Registry::TYPES;

		if ( isset( $stored['enabled_sections'] ) && is_array( $stored['enabled_sections'] ) ) {
			return array_values( array_intersect( $defaults, $stored['enabled_sections'] ) );
		}

		return $defaults;
	}
}
