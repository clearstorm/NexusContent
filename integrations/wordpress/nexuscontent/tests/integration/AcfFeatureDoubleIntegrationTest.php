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
	 * @param array<int, array<int, array<string, string>>> $location
	 * @return array<int, string>
	 */
	private function location_post_types( array $location ): array {
		$values = array();
		foreach ( $location as $rules ) {
			foreach ( $rules as $rule ) {
				if ( ( $rule['param'] ?? '' ) === 'post_type' ) {
					$values[] = $rule['value'];
				}
			}
		}
		return $values;
	}

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
		self::assertSame( array( 'page', 'post' ), $this->location_post_types( $GLOBALS['nc_acf_groups'][0]['location'] ) );
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
		self::assertSame( array( 'page', 'post' ), $this->location_post_types( $flexible[0]['location'] ) );
		$fixed = array_values( array_filter( $GLOBALS['nc_acf_groups'], static fn( array $group ): bool => 'group_nc_fixed_page_sections' === $group['key'] ) );
		self::assertSame( array( 'page', 'post' ), $this->location_post_types( $fixed[0]['location'] ) );
	}

	/**
	 * @runInSeparateProcess
	 * @preserveGlobalState disabled
	 */
	public function test_custom_section_through_registry_filter_gets_a_flexible_layout_and_acf_fields(): void {
		if ( function_exists( 'acf_add_local_field_group' ) ) {
			$this->markTestSkipped( 'A real ACF installation is active.' );
		}
		eval( 'function acf_add_local_field_group($group) { $GLOBALS["nc_acf_groups"][] = $group; } function acf_get_field_type($type) { return in_array($type, array("repeater", "gallery", "flexible_content"), true); } function acf_register_block_type($args) { $GLOBALS["nc_acf_blocks"][] = $args; }' );
		\add_filter( 'nexuscontent_section_definitions', static function ( array $definitions ): array {
			$definitions['services_list'] = array(
				'aliases' => array( 'consumer/services' ),
				'label'   => 'Services List',
				'fields'  => array(
					array( 'name' => 'heading', 'type' => 'string' ),
					array( 'name' => 'icon', 'type' => 'media' ),
					array( 'name' => 'items', 'type' => 'json' ),
				),
			);
			return $definitions;
		} );
		$limitations = array();
		\add_action( 'nexuscontent_acf_limitations', static function ( array $found ) use ( &$limitations ): void {
			$limitations = $found;
		} );

		$loader = new ACF_Loader( new Section_Registry() );
		$loader->initialize();

		$flexible = array_values( array_filter( $GLOBALS['nc_acf_groups'], static fn( array $group ): bool => 'group_nc_flexible_sections' === $group['key'] ) );
		self::assertCount( 1, $flexible );
		self::assertCount( 13, $flexible[0]['fields'][0]['layouts'] );

		$custom = array_values( array_filter( $flexible[0]['fields'][0]['layouts'], static fn( array $layout ): bool => 'services_list' === $layout['name'] ) );
		self::assertCount( 1, $custom );
		self::assertEquals( 'Services List', $custom[0]['label'] );
		$field_defs = array_column( $custom[0]['sub_fields'], 'type', 'name' );
		self::assertSame( 'text', $field_defs['heading'] );
		self::assertSame( 'image', $field_defs['icon'] );
		self::assertArrayNotHasKey( 'items', $field_defs );
		$skipped = array_values( array_filter( $limitations, static fn( string $message ): bool => str_contains( $message, 'field "items" was skipped' ) ) );
		self::assertNotEmpty( $skipped );
	}
}
