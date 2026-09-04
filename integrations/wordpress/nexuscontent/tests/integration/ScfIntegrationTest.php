<?php

namespace NexusContent\Companion\Tests\Integration;

require_once __DIR__ . '/IntegrationTestCase.php';

/**
 * @group scf-real
 */
final class ScfIntegrationTest extends IntegrationTestCase {
	public function test_scf_registers_and_serves_site_option_fields(): void {
		self::assertTrue( function_exists( 'acf_add_options_page' ) );
		self::assertTrue( function_exists( 'acf_get_local_field_group' ) );
		$group = acf_get_local_field_group( 'group_nc_site_settings' );
		self::assertIsArray( $group );
		self::assertContains( 'nexus_site_name', array_column( acf_get_fields( $group ), 'name' ) );

		update_field( 'nexus_site_name', 'SCF site', 'option' );
		update_field( 'nexus_site_phone', '+27 10 000 0000', 'option' );
		update_field( 'nexus_site_social', array( 'facebook' => 'https://facebook.com/example' ), 'option' );
		$response = $this->request( '/nexuscontent/v1/settings' );
		self::assertSame( 200, $response->get_status() );
		$data = $this->envelope( $response )['data'];
		self::assertSame( 'SCF site', $data['name'] );
		self::assertSame( '+27 10 000 0000', $data['phone'] );
		self::assertSame( 'https://facebook.com/example', $data['social']['facebook'] );
	}

	public function test_scf_seo_group_is_limited_to_acf_editor_modes(): void {
		$group = acf_get_local_field_group( 'group_nc_seo' );
		self::assertIsArray( $group );
		self::assertCount( 4, $group['location'] );
		self::assertSame( array( 'acf_flexible', 'acf_flexible', 'acf_fixed', 'acf_fixed' ), array_column( array_column( $group['location'], 1 ), 'value' ) );
		$names = array_column( acf_get_fields( $group ), 'name' );
		self::assertContains( 'nexus_seo_og_type', $names );
		self::assertContains( 'nexus_seo_tw_card', $names );
	}
}
