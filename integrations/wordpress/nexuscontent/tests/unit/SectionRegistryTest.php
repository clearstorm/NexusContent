<?php

namespace NexusContent\Companion\Tests\Unit;

require_once dirname( __DIR__ ) . '/bootstrap.php';
require_once dirname( __DIR__ ) . '/TestCase.php';

use NexusContent\Companion\Section_Registry;
use NexusContent\Companion\Tests\TestCase;

final class SectionRegistryTest extends TestCase {
	public function test_registry_contains_every_canonical_fixture_type(): void {
		$registry = new Section_Registry();
		self::assertCount( 12, $registry->definitions() );
		self::assertSame( Section_Registry::TYPES, array_keys( $registry->definitions() ) );
		foreach ( Section_Registry::TYPES as $type ) {
			self::assertSame( $type, $this->fixture( $type )['type'] );
		}
	}

	public function test_native_acf_and_layout_aliases_resolve_to_the_same_type(): void {
		$registry = new Section_Registry();
		foreach ( Section_Registry::TYPES as $type ) {
			$source = str_replace( '_', '-', $type );
			self::assertSame( $type, $registry->resolve( 'nexuscontent/' . $source ) );
			self::assertSame( $type, $registry->resolve( 'acf/' . $source ) );
			self::assertSame( $type, $registry->resolve( $source ) );
			self::assertSame( $type, $registry->resolve( $type ) );
		}
		self::assertNull( $registry->resolve( 'vendor/unknown' ) );
	}

	public function test_source_mapping_publishes_native_acf_and_layout_spellings(): void {
		$mappings = ( new Section_Registry() )->source_mappings();
		foreach ( array( 'rich_text', 'image_text', 'logo_grid', 'form_embed' ) as $type ) {
			$hyphenated = str_replace( '_', '-', $type );
			self::assertSame( $type, $mappings[ 'nexuscontent/' . $hyphenated ] ?? null );
			self::assertSame( $type, $mappings[ 'acf/' . $hyphenated ] ?? null );
			self::assertSame( $type, $mappings[ $hyphenated ] ?? null );
			self::assertSame( $type, $mappings[ $type ] ?? null );
		}
	}

	public function test_filtered_definitions_keep_required_canonical_aliases_and_safe_schema(): void {
		\add_filter( 'nexuscontent_section_definitions', static function ( array $definitions ): array {
			$definitions['hero']['aliases'] = array( 'site/banner' );
			$definitions['hero']['fields'][] = array( 'name' => '<unsafe>', 'type' => 'string', 'required' => 1 );
			return $definitions;
		} );
		$registry = new Section_Registry();
		self::assertSame( 'hero', $registry->resolve( 'site/banner' ) );
		self::assertSame( 'hero', $registry->resolve( 'nexuscontent/hero' ) );
		$hero = $registry->rest_definitions()[0];
		self::assertSame( 'unsafe', $hero['fields'][ count( $hero['fields'] ) - 1 ]['name'] );
		self::assertTrue( $hero['fields'][ count( $hero['fields'] ) - 1 ]['required'] );
	}

	public function test_filter_can_add_a_json_serializable_custom_section(): void {
		\add_filter( 'nexuscontent_section_definitions', static function ( array $definitions ): array {
			$definitions['promo_banner'] = array(
				'aliases' => array( 'site/promo' ),
				'fields'  => array( array( 'name' => 'heading', 'type' => 'string' ) ),
			);
			return $definitions;
		} );
		$registry = new Section_Registry();
		self::assertSame( 'promo_banner', $registry->resolve( 'site/promo' ) );
		self::assertContains( 'promo_banner', array_column( $registry->rest_definitions(), 'type' ) );
	}
}
