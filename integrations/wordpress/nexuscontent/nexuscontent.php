<?php
/**
 * Plugin Name:       NexusContent Companion
 * Description:       Exposes normalized WordPress content for NexusContent consumers.
 * Version:           0.1.3
 * Requires at least: 6.6
 * Requires PHP:      8.1
 * Author:            NexusContent
 * Text Domain:       nexuscontent
 * Domain Path:       /languages
 * License:           MIT
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'NEXUSCONTENT_COMPANION_VERSION', '0.1.3' );
define( 'NEXUSCONTENT_COMPANION_CONTRACT_VERSION', 1 );
define( 'NEXUSCONTENT_COMPANION_REST_NAMESPACE', 'nexuscontent/v1' );
define( 'NEXUSCONTENT_COMPANION_FILE', __FILE__ );
define( 'NEXUSCONTENT_COMPANION_DIR', plugin_dir_path( __FILE__ ) );

$nexuscontent_companion_files = array(
	'includes/class-contract.php',
	'includes/class-diagnostics.php',
	'includes/class-capabilities.php',
	'includes/class-editor-mode.php',
	'includes/class-section-registry.php',
	'includes/class-media-normalizer.php',
	'includes/class-normalizer.php',
	'includes/class-preview-token.php',
	'includes/class-webhook-dispatcher.php',
	'includes/class-rest-controller.php',
	'includes/class-admin-page.php',
	'includes/class-plugin.php',
);

foreach ( $nexuscontent_companion_files as $nexuscontent_companion_file ) {
	$nexuscontent_companion_path = NEXUSCONTENT_COMPANION_DIR . $nexuscontent_companion_file;
	if ( ! is_readable( $nexuscontent_companion_path ) ) {
		throw new RuntimeException( 'NexusContent Companion is incomplete: ' . esc_html( $nexuscontent_companion_file ) );
	}
	require_once $nexuscontent_companion_path;
}

add_action( 'plugins_loaded', array( 'NexusContent\Companion\Plugin', 'boot' ) );
