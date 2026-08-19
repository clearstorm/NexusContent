<?php

namespace NexusContent\Companion\Tests\Unit;

require_once dirname( __DIR__ ) . '/bootstrap.php';
require_once dirname( __DIR__ ) . '/TestCase.php';

use NexusContent\Companion\ACF_Field_Factory;
use NexusContent\Companion\Tests\TestCase;

final class AcfFieldFactoryTest extends TestCase {
	public function test_fixed_fields_are_free_compatible_and_have_stable_unique_keys(): void {
		$keys = array();
		foreach ( array( 'hero', 'intro', 'cta' ) as $type ) {
			$limitations = array();
			$fields = ACF_Field_Factory::fields_for( $type, array( 'repeater' => false, 'gallery' => false ), $limitations, 'fixed' );
			self::assertNotNull( $fields );
			self::assertSame( array(), $limitations );
			self::assertContains( 'variant', array_column( $fields, 'name' ) );
			self::assertContains( 'theme', array_column( $fields, 'name' ) );
			$keys = array_merge( $keys, array_column( $fields, 'key' ) );
		}
		self::assertSame( $keys, array_values( array_unique( $keys ) ) );
	}

	public function test_pro_only_layouts_are_omitted_with_clear_limitations_when_fields_are_unavailable(): void {
		$limitations = array();
		self::assertNull( ACF_Field_Factory::layout_for( 'features', array( 'repeater' => false, 'gallery' => false ), $limitations ) );
		self::assertNotEmpty( $limitations );
		self::assertStringContainsString( 'repeater', $limitations[0] );
		$limitations = array();
		self::assertNull( ACF_Field_Factory::layout_for( 'gallery', array( 'repeater' => true, 'gallery' => false ), $limitations ) );
		self::assertStringContainsString( 'gallery', $limitations[0] );
	}

	public function test_logo_grid_items_allow_a_label_a_logo_or_both(): void {
		$limitations = array();
		$layout      = ACF_Field_Factory::layout_for( 'logo_grid', array( 'repeater' => true, 'gallery' => true ), $limitations );
		self::assertNotNull( $layout );
		self::assertSame( array(), $limitations );

		$items = array_values( array_filter( $layout['sub_fields'], static fn( array $field ): bool => 'items' === $field['name'] ) )[0];
		self::assertSame( array( 'name', 'logo', 'url' ), array_column( $items['sub_fields'], 'name' ) );
		self::assertSame( 'Label', $items['sub_fields'][0]['label'] );
		self::assertSame( 'image', $items['sub_fields'][1]['type'] );
		self::assertSame( 'id', $items['sub_fields'][1]['return_format'] );
		self::assertStringContainsString( 'label, a logo, or both', $items['sub_fields'][1]['instructions'] );
	}
}
