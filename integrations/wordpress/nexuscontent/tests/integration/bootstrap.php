<?php
/**
 * Bootstrap for the official WordPress PHPUnit test suite.
 *
 * Set WP_TESTS_DIR to a WordPress develop tests/phpunit directory.
 */

$wp_tests_dir = getenv( 'WP_TESTS_DIR' );
$wp_tests_dir = $wp_tests_dir ?: '/tmp/wordpress-tests-lib';
$polyfills_dir = dirname( __DIR__, 2 ) . '/vendor/yoast/phpunit-polyfills';
if ( is_dir( $polyfills_dir ) ) {
	putenv( 'WP_TESTS_PHPUNIT_POLYFILLS_PATH=' . $polyfills_dir );
}

if ( is_readable( $wp_tests_dir . '/includes/functions.php' ) && is_readable( $wp_tests_dir . '/includes/bootstrap.php' ) ) {
	require_once $wp_tests_dir . '/includes/functions.php';
	tests_add_filter(
		'muplugins_loaded',
		static function (): void {
			if ( '1' === getenv( 'NEXUSCONTENT_TEST_ACF' ) ) {
				$acf_file = WP_PLUGIN_DIR . '/advanced-custom-fields/acf.php';
				if ( ! is_readable( $acf_file ) ) {
					throw new RuntimeException( 'ACF Free test plugin is unavailable.' );
				}
				require_once $acf_file;
			}
			require dirname( __DIR__, 2 ) . '/nexuscontent.php';
		}
	);
	require_once $wp_tests_dir . '/includes/bootstrap.php';
} else {
	fwrite( STDERR, "WordPress test suite unavailable; set WP_TESTS_DIR.\n" );
	exit( 1 );
}
