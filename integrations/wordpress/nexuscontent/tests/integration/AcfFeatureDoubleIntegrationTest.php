<?php

namespace NexusContent\Companion\Tests\Integration;

require_once __DIR__ . '/IntegrationTestCase.php';

use NexusContent\Companion\ACF_Loader;
use NexusContent\Companion\Section_Registry;

/**
 * These tests use feature doubles only; neither ACF Free nor ACF Pro is bundled.
 *
 * @group acf-doubles
 */
final class AcfFeatureDoubleIntegrationTest extends IntegrationTestCase {
	/**
	 * @runInSeparateProcess
	 * @preserveGlobalState disabled
	 */
	public function test_mock_acf_free_registers_fixed_groups_without_commercial_fields(): void {
		if ( function_exists( 'acf_add_local_field_group' ) ) {
			$this->markTestSkipped( 'A real ACF installation is active.' );
		}
		eval( 'function acf_add_local_field_group($group) { $GLOBALS["nc_acf_groups"][] = $group; } function acf_get_field_type($type) { return false; }' );
		$loader = new ACF_Loader( new Section_Registry() );
		$loader->initialize();
		self::assertNotEmpty( $GLOBALS['nc_acf_groups'] );
		self::assertSame( 'group_nc_fixed_page_sections', $GLOBALS['nc_acf_groups'][0]['key'] );
		$names = array_column( $GLOBALS['nc_acf_groups'][0]['fields'], 'name' );
		foreach ( array( 'hero_enabled', 'hero_heading', 'intro_enabled', 'intro_heading', 'cta_enabled', 'cta_heading' ) as $name ) {
			self::assertContains( $name, $names );
		}
	}

	/**
	 * @runInSeparateProcess
	 * @preserveGlobalState disabled
	 */
	public function test_mock_acf_pro_features_register_flexible_layouts_without_commercial_package(): void {
		if ( function_exists( 'acf_add_local_field_group' ) ) {
			$this->markTestSkipped( 'A real ACF installation is active.' );
		}
		eval( 'function acf_add_local_field_group($group) { $GLOBALS["nc_acf_groups"][] = $group; } function acf_get_field_type($type) { return in_array($type, array("repeater", "gallery", "flexible_content"), true); } function acf_register_block_type($args) { $GLOBALS["nc_acf_blocks"][] = $args; }' );
		$loader = new ACF_Loader( new Section_Registry() );
		$loader->initialize();
		$flexible = array_values( array_filter( $GLOBALS['nc_acf_groups'], static fn( array $group ): bool => 'group_nc_flexible_sections' === $group['key'] ) );
		self::assertCount( 1, $flexible );
		self::assertCount( 12, $flexible[0]['fields'][0]['layouts'] );
	}
}
