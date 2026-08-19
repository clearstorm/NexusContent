<?php
/**
 * Per-page editor mode metadata and classic editor fallback UI.
 *
 * @package NexusContentCompanion
 */

namespace NexusContent\Companion;

use WP_Post;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Editor_Mode {
	public const META_KEY     = 'nexus_editor_mode';
	public const GUTENBERG    = 'gutenberg';
	public const ACF_FLEXIBLE = 'acf_flexible';
	public const ACF_FIXED    = 'acf_fixed';
	public const VALID_MODES  = array( self::GUTENBERG, self::ACF_FLEXIBLE, self::ACF_FIXED );

	private Capabilities $capabilities;

	public function __construct( Capabilities $capabilities ) {
		$this->capabilities = $capabilities;
	}

	public function register(): void {
		add_action( 'init', array( $this, 'register_meta' ) );
		add_action( 'add_meta_boxes_page', array( $this, 'add_meta_box' ) );
		add_action( 'save_post_page', array( $this, 'save' ), 10, 2 );
		add_action( 'admin_notices', array( $this, 'conflict_notice' ) );
	}

	public function register_meta(): void {
		register_post_meta(
			'page',
			self::META_KEY,
			array(
				'type'              => 'string',
				'single'            => true,
				'default'           => self::GUTENBERG,
				'show_in_rest'      => array(
					'schema' => array(
						'type'    => 'string',
						'enum'    => self::VALID_MODES,
						'default' => self::GUTENBERG,
					),
				),
				'sanitize_callback' => array( $this, 'sanitize' ),
				'auth_callback'     => static function ( bool $allowed, string $meta_key, int $post_id ): bool {
					return current_user_can( 'edit_post', $post_id );
				},
			)
		);
	}

	/** @param mixed $value */
	public function sanitize( $value ): string {
		$value = is_string( $value ) ? sanitize_key( $value ) : '';
		return in_array( $value, self::VALID_MODES, true ) ? $value : self::GUTENBERG;
	}

	public function get( int $post_id ): string {
		$value = get_post_meta( $post_id, self::META_KEY, true );
		return is_string( $value ) && in_array( $value, self::VALID_MODES, true ) ? $value : self::GUTENBERG;
	}

	public function add_meta_box(): void {
		add_meta_box(
			'nexuscontent-editor-mode',
			esc_html__( 'NexusContent editor mode', 'nexuscontent' ),
			array( $this, 'render_meta_box' ),
			'page',
			'side',
			'default'
		);
	}

	public function render_meta_box( WP_Post $post ): void {
		$current = $this->get( $post->ID );
		wp_nonce_field( 'nexuscontent_save_editor_mode', 'nexuscontent_editor_mode_nonce' );
		?>
		<p>
			<label for="nexus-editor-mode"><?php esc_html_e( 'Content source', 'nexuscontent' ); ?></label>
			<select id="nexus-editor-mode" name="nexus_editor_mode" class="widefat">
				<?php foreach ( self::VALID_MODES as $mode ) : ?>
					<option value="<?php echo esc_attr( $mode ); ?>" <?php selected( $current, $mode ); ?> <?php disabled( ! $this->capabilities->supports_mode( $mode ) ); ?>><?php echo esc_html( $this->label( $mode ) ); ?></option>
				<?php endforeach; ?>
			</select>
		</p>
		<p class="description"><?php esc_html_e( 'ACF fixed mode provides only Hero, Introduction, and Call to Action fields. Changing modes does not delete content from another editor.', 'nexuscontent' ); ?></p>
		<?php foreach ( self::VALID_MODES as $mode ) : ?>
			<?php if ( ! $this->capabilities->supports_mode( $mode ) ) : ?>
				<p class="description"><strong><?php echo esc_html( $this->label( $mode ) ); ?>:</strong> <?php echo esc_html( $this->unavailable_reason( $mode ) ); ?></p>
			<?php endif; ?>
		<?php endforeach; ?>
		<?php
	}

	public function save( int $post_id, WP_Post $post ): void {
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}
		$nonce = isset( $_POST['nexuscontent_editor_mode_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['nexuscontent_editor_mode_nonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'nexuscontent_save_editor_mode' ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		if ( ! isset( $_POST['nexus_editor_mode'] ) ) {
			return;
		}

		$mode = sanitize_key( wp_unslash( $_POST['nexus_editor_mode'] ) );
		if ( ! in_array( $mode, self::VALID_MODES, true ) || ! $this->capabilities->supports_mode( $mode ) ) {
			return;
		}

		update_post_meta( $post_id, self::META_KEY, $mode );
	}

	public function conflict_notice(): void {
		$screen = get_current_screen();
		if ( ! $screen || 'page' !== $screen->post_type || 'post' !== $screen->base ) {
			return;
		}

		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
		if ( ! $post_id ) {
			return;
		}
		$mode = $this->get( $post_id );
		if ( ! $this->capabilities->supports_mode( $mode ) ) {
			?>
			<div class="notice notice-warning"><p>
				<?php
				echo esc_html(
					sprintf(
						/* translators: %s: configured editor mode. */
						__( 'NexusContent mode "%s" is unavailable. Existing content has not been changed; select an available mode before editing.', 'nexuscontent' ),
						$mode
					)
				);
				?>
			</p></div>
			<?php
		}

		if ( $this->has_conflicting_content( $post_id ) ) {
			?>
			<div class="notice notice-warning"><p><?php esc_html_e( 'This page contains content in more than one NexusContent editor source. Only the active mode is exported; inactive content remains stored.', 'nexuscontent' ); ?></p></div>
			<?php
		}
	}

	private function has_conflicting_content( int $post_id ): bool {
		$sources = 0;
		$content = get_post_field( 'post_content', $post_id );
		if ( is_string( $content ) && '' !== trim( $content ) ) {
			++$sources;
		}
		if ( metadata_exists( 'post', $post_id, 'nexus_sections' ) && '' !== get_post_meta( $post_id, 'nexus_sections', true ) ) {
			++$sources;
		}
		foreach ( $this->fixed_field_keys() as $key ) {
			if ( metadata_exists( 'post', $post_id, $key ) && '' !== get_post_meta( $post_id, $key, true ) ) {
				++$sources;
				break;
			}
		}

		return $sources > 1;
	}

	/** @return array<int, string> */
	private function fixed_field_keys(): array {
		$fields = array(
			'hero'  => array( 'section_id', 'variant', 'eyebrow', 'heading', 'body', 'image', 'primary_action_label', 'primary_action_url', 'secondary_action_label', 'secondary_action_url', 'theme' ),
			'intro' => array( 'section_id', 'variant', 'eyebrow', 'heading', 'body', 'image', 'image_position', 'theme' ),
			'cta'   => array( 'section_id', 'variant', 'heading', 'body', 'primary_action_label', 'primary_action_url', 'secondary_action_label', 'secondary_action_url', 'background_image', 'theme' ),
		);
		$keys   = array();
		foreach ( $fields as $type => $names ) {
			$keys[] = $type . '_enabled';
			foreach ( $names as $name ) {
				$keys[] = $type . '_' . $name;
			}
		}
		return $keys;
	}

	private function label( string $mode ): string {
		return match ( $mode ) {
			self::ACF_FLEXIBLE => __( 'ACF flexible sections', 'nexuscontent' ),
			self::ACF_FIXED    => __( 'ACF fixed fields', 'nexuscontent' ),
			default            => __( 'Block editor', 'nexuscontent' ),
		};
	}

	private function unavailable_reason( string $mode ): string {
		return match ( $mode ) {
			self::ACF_FLEXIBLE => __( 'Requires ACF 6.2 or newer with Flexible Content.', 'nexuscontent' ),
			self::ACF_FIXED    => __( 'Requires ACF 6.2 or newer.', 'nexuscontent' ),
			default            => __( 'The page post type does not support the block editor.', 'nexuscontent' ),
		};
	}
}
