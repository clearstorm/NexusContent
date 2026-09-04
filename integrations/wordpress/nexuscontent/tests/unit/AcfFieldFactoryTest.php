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
			$fields = ACF_Field_Factory::fields_for( $type, array( 'repeater' => true, 'gallery' => true ), $limitations, 'fixed' );
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

	public function test_logo_grid_items_allow_a_name_and_logo_image(): void {
		$limitations = array();
		$layout      = ACF_Field_Factory::layout_for( 'logo_grid', array( 'repeater' => true, 'gallery' => true ), $limitations );
		self::assertNotNull( $layout );
		self::assertSame( array(), $limitations );

		$items = array_values( array_filter( $layout['sub_fields'], static fn( array $field ): bool => 'items' === $field['name'] ) )[0];
		self::assertSame( array( 'name', 'image' ), array_column( $items['sub_fields'], 'name' ) );
		self::assertSame( 'Label', $items['sub_fields'][0]['label'] );
		self::assertSame( 'image', $items['sub_fields'][1]['type'] );
		self::assertSame( 'id', $items['sub_fields'][1]['return_format'] );
		self::assertStringContainsString( 'logo image', $items['sub_fields'][1]['instructions'] );
	}

	public function test_hero_layout_exposes_a_repeatable_buttons_subcomponent(): void {
		$limitations = array();
		$layout      = ACF_Field_Factory::layout_for( 'hero', array( 'repeater' => true ), $limitations );
		self::assertNotNull( $layout );
		self::assertSame( array(), $limitations );

		$buttons = array_values( array_filter( $layout['sub_fields'], static fn( array $field ): bool => 'buttons' === $field['name'] ) )[0];
		self::assertSame( 'repeater', $buttons['type'] );
		self::assertSame( array( 'label', 'url', 'variant' ), array_column( $buttons['sub_fields'], 'name' ) );
		self::assertSame( 'text', $buttons['sub_fields'][1]['type'] );
		self::assertSame( 'select', $buttons['sub_fields'][2]['type'] );
		self::assertSame( array( 'primary', 'secondary', 'light' ), array_keys( $buttons['sub_fields'][2]['choices'] ) );
	}

	public function test_feature_items_use_title_description_points_and_thumbnail(): void {
		$limitations = array();
		$layout      = ACF_Field_Factory::layout_for( 'features', array( 'repeater' => true ), $limitations );
		self::assertNotNull( $layout );

		$items = array_values( array_filter( $layout['sub_fields'], static fn( array $field ): bool => 'items' === $field['name'] ) )[0];
		self::assertSame( array( 'title', 'description', 'points', 'thumbnail' ), array_column( $items['sub_fields'], 'name' ) );
		self::assertSame( 'repeater', $items['sub_fields'][2]['type'] );
		self::assertSame( 'image', $items['sub_fields'][3]['type'] );
	}

	public function test_testimonial_items_use_quote_author_and_avatar(): void {
		$limitations = array();
		$layout      = ACF_Field_Factory::layout_for( 'testimonials', array( 'repeater' => true ), $limitations );
		self::assertNotNull( $layout );

		$items = array_values( array_filter( $layout['sub_fields'], static fn( array $field ): bool => 'items' === $field['name'] ) )[0];
		self::assertSame( array( 'quote', 'author', 'avatar' ), array_column( $items['sub_fields'], 'name' ) );
		self::assertSame( 'image', $items['sub_fields'][2]['type'] );
	}

	public function test_faq_items_use_a_text_area_answer(): void {
		$limitations = array();
		$layout      = ACF_Field_Factory::layout_for( 'faq', array( 'repeater' => true ), $limitations );
		self::assertNotNull( $layout );

		$items = array_values( array_filter( $layout['sub_fields'], static fn( array $field ): bool => 'items' === $field['name'] ) )[0];
		self::assertSame( array( 'question', 'answer' ), array_column( $items['sub_fields'], 'name' ) );
		self::assertSame( 'textarea', $items['sub_fields'][1]['type'] );
	}
}
