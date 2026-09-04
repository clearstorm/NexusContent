<?php
/**
 * Plugin service wiring.
 *
 * @package NexusContentCompanion
 */

namespace NexusContent\Companion;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Plugin {
	private static bool $booted = false;

	public static function boot(): void {
		if ( self::$booted ) {
			return;
		}
		self::$booted = true;

		add_action( 'init', array( self::class, 'load_textdomain' ), 1 );

		$registry     = new Section_Registry();
		$capabilities = new Capabilities( $registry );
		$editor_mode  = new Editor_Mode( $capabilities );
		$media        = new Media_Normalizer();
		$seo          = new Seo_Fields();
		$normalizer   = new Normalizer( $editor_mode, $registry, $media, $seo );
		$controller   = new REST_Controller( new Contract(), $normalizer, $registry, $capabilities );

		$editor_mode->register();
		$seo->register();
		add_action( 'rest_api_init', array( $controller, 'register_routes' ) );

		$admin_page = new Admin_Page( $capabilities, $registry );
		$admin_page->register();

		$webhook = new Webhook_Dispatcher();
		$webhook->register();

		self::boot_optional_integrations( $registry );

		/**
		 * Fires after the Companion core APIs are available.
		 *
		 * Registration integrations can use the registry without coupling the core
		 * bootstrap to ACF or block implementation details.
		 *
		 * @param Section_Registry $registry Canonical section registry.
		 */
		do_action( 'nexuscontent_companion_loaded', $registry );
	}

	public static function load_textdomain(): void {
		load_plugin_textdomain( 'nexuscontent', false, dirname( plugin_basename( NEXUSCONTENT_COMPANION_FILE ) ) . '/languages' );
	}

	private static function boot_optional_integrations( Section_Registry $registry ): void {
		$shared_files = array(
			'includes/blocks/class-block-normalizer.php',
			'includes/blocks/class-block-loader.php',
			'includes/acf/class-acf-field-factory.php',
			'includes/acf/class-acf-loader.php',
		);
		foreach ( $shared_files as $file ) {
			$path = NEXUSCONTENT_COMPANION_DIR . $file;
			if ( ! is_readable( $path ) ) {
				throw new \RuntimeException( 'NexusContent Companion is incomplete: ' . esc_html( $file ) );
			}
			require_once $path;
		}

		$integrations = array(
			array( 'includes/acf/class-registration.php', 'NexusContent\Companion\ACF\Registration' ),
			array( 'includes/blocks/class-registration.php', 'NexusContent\Companion\Blocks\Registration' ),
		);

		foreach ( $integrations as $integration ) {
			list( $file, $class ) = $integration;
			$path                 = NEXUSCONTENT_COMPANION_DIR . $file;
			if ( ! is_readable( $path ) ) {
				throw new \RuntimeException( 'NexusContent Companion is incomplete: ' . esc_html( $file ) );
			}
			require_once $path;
			if ( class_exists( $class ) && is_callable( array( $class, 'register' ) ) ) {
				$class::register( $registry );
			}
		}
	}
}
