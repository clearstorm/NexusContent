<?php

namespace NexusContent\Companion\Tests\Integration;

require_once __DIR__ . '/IntegrationTestCase.php';

use NexusContent\Companion\Editor_Mode;

final class RegistrationIntegrationTest extends IntegrationTestCase {
	public function test_companion_loads_and_registers_without_acf(): void {
		self::assertTrue( class_exists( 'NexusContent\\Companion\\Plugin' ) );
		self::assertTrue( class_exists( 'NexusContent\\Companion\\Normalizer' ) );
		if ( function_exists( 'get_field' ) || class_exists( 'ACF' ) ) {
			$this->markTestSkipped( 'This assertion requires the stock WordPress suite without ACF.' );
		}
		$response = $this->request( '/nexuscontent/v1/capabilities' );
		self::assertSame( 200, $response->get_status() );
		self::assertFalse( $this->envelope( $response )['data']['acf'] );
	}

	public function test_editor_meta_native_blocks_and_rest_routes_are_registered(): void {
		$registered = get_registered_meta_keys( 'post', 'page' );
		self::assertArrayHasKey( Editor_Mode::META_KEY, $registered );
		self::assertSame( array( 'gutenberg', 'acf_flexible', 'acf_fixed' ), $registered[ Editor_Mode::META_KEY ]['show_in_rest']['schema']['enum'] );

		$block_registry = \WP_Block_Type_Registry::get_instance();
		foreach ( array( 'hero', 'intro', 'rich-text', 'image-text', 'features', 'statistics', 'testimonials', 'gallery', 'cta', 'faq', 'logo-grid', 'form-embed' ) as $type ) {
			self::assertTrue( $block_registry->is_registered( 'nexuscontent/' . $type ), $type . ' block was not registered' );
			$block = $block_registry->get_registered( 'nexuscontent/' . $type );
			self::assertSame( false, $block->attributes['preview']['default'] );
			self::assertTrue( $block->example['attributes']['preview'] );
		}

		$routes = rest_get_server()->get_routes();
		foreach ( array( '/nexuscontent/v1/pages', '/nexuscontent/v1/pages/(?P<id>\d+)', '/nexuscontent/v1/pages/slug/(?P<slug>[^/]+)', '/nexuscontent/v1/schema', '/nexuscontent/v1/capabilities' ) as $route ) {
			self::assertArrayHasKey( $route, $routes );
		}
	}

	public function test_public_schema_and_capabilities_match_the_contract(): void {
		$schema = $this->request( '/nexuscontent/v1/schema' );
		self::assertSame( 200, $schema->get_status() );
		$schema_data = $this->envelope( $schema )['data'];
		self::assertCount( 12, $schema_data['sectionDefinitions'] );
		self::assertSame( 'hero', $schema_data['sourceMappings']['nexuscontent/hero'] );
		self::assertSame( 'image_text', $schema_data['sourceMappings']['nexuscontent/image-text'] );

		$capabilities = $this->request( '/nexuscontent/v1/capabilities' );
		self::assertSame( 200, $capabilities->get_status() );
		self::assertContains( 'gutenberg', $this->envelope( $capabilities )['data']['editorModes'] );
	}
}
