<?php

namespace NexusContent\Companion\Tests\Integration;

require_once __DIR__ . '/IntegrationTestCase.php';

/**
 * @group acf-real
 */
final class AcfFreeIntegrationTest extends IntegrationTestCase {
	public function test_real_acf_free_registers_fixed_fields(): void {
		self::assertTrue( defined( 'ACF_VERSION' ) );
		self::assertTrue( version_compare( (string) ACF_VERSION, '6.2', '>=' ) );
		self::assertTrue( function_exists( 'acf_get_local_field_group' ) );
		$group = acf_get_local_field_group( 'group_nc_fixed_page_sections' );
		self::assertIsArray( $group );
		$fields = acf_get_fields( $group );
		self::assertIsArray( $fields );
		$names = array_column( $fields, 'name' );
		foreach ( array( 'hero_enabled', 'hero_heading', 'intro_enabled', 'intro_heading', 'cta_enabled', 'cta_heading' ) as $name ) {
			self::assertContains( $name, $names );
		}
	}
}
