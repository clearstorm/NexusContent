<?php

namespace NexusContent\Companion\Tests\Unit;

require_once dirname( __DIR__ ) . '/bootstrap.php';
require_once dirname( __DIR__ ) . '/TestCase.php';

use NexusContent\Companion\Capabilities;
use NexusContent\Companion\Editor_Mode;
use NexusContent\Companion\Tests\TestCase;

final class EditorModeCapabilitiesTest extends TestCase {
	public function test_sanitize_accepts_only_declared_modes_and_defaults_safely(): void {
		$mode = new Editor_Mode( new Capabilities() );
		self::assertSame( 'gutenberg', $mode->sanitize( 'GUTENBERG' ) );
		self::assertSame( 'acf_flexible', $mode->sanitize( 'acf_flexible' ) );
		self::assertSame( 'acf_fixed', $mode->sanitize( 'acf_fixed' ) );
		self::assertSame( 'gutenberg', $mode->sanitize( 'acf/../../fixed' ) );
		self::assertSame( 'gutenberg', $mode->sanitize( array( 'acf_fixed' ) ) );
	}

	public function test_get_defaults_invalid_or_missing_metadata_to_gutenberg(): void {
		$mode = new Editor_Mode( new Capabilities() );
		self::assertSame( 'gutenberg', $mode->get( 42 ) );
		$GLOBALS['nc_test']['meta'][42][ Editor_Mode::META_KEY ] = 'invalid';
		self::assertSame( 'gutenberg', $mode->get( 42 ) );
	}

	public function test_without_acf_only_the_available_block_editor_is_reported(): void {
		$capabilities = new Capabilities();
		self::assertSame( array( 'gutenberg' ), $capabilities->editor_modes() );
		self::assertTrue( $capabilities->supports_mode( 'gutenberg' ) );
		self::assertFalse( $capabilities->supports_mode( 'acf_fixed' ) );
		self::assertSame(
			array( 'gutenberg' => true, 'acf' => false, 'acfPro' => false, 'acfBlocks' => false, 'flexibleContent' => false ),
			array_intersect_key( $capabilities->get(), array_flip( array( 'gutenberg', 'acf', 'acfPro', 'acfBlocks', 'flexibleContent' ) ) )
		);
	}

	public function test_disabled_block_editor_produces_no_false_editor_mode(): void {
		$GLOBALS['nc_test']['block_editor'] = false;
		self::assertSame( array(), ( new Capabilities() )->editor_modes() );
	}

	/**
	 * @runInSeparateProcess
	 * @preserveGlobalState disabled
	 */
	public function test_mocked_acf_free_exposes_fixed_fields_but_not_pro_features(): void {
		eval( 'class ACF {}' ); // Deliberate ACF Free feature double; no commercial package is loaded.
		$capabilities = new Capabilities();
		self::assertContains( 'acf_fixed', $capabilities->editor_modes() );
		self::assertNotContains( 'acf_flexible', $capabilities->editor_modes() );
		self::assertTrue( $capabilities->get()['acf'] );
		self::assertFalse( $capabilities->get()['acfPro'] );
	}

	/**
	 * @runInSeparateProcess
	 * @preserveGlobalState disabled
	 */
	public function test_mocked_acf_pro_features_are_detected_by_feature_not_brand_assumption(): void {
		eval( 'class ACF {}' ); // Deliberate ACF feature double; no commercial package is loaded.
		$GLOBALS['nc_test']['acf_field_types']['flexible_content'] = true;
		$GLOBALS['nc_test']['acf_pro'] = true;
		$capabilities = new Capabilities();
		self::assertContains( 'acf_fixed', $capabilities->editor_modes() );
		self::assertContains( 'acf_flexible', $capabilities->editor_modes() );
		self::assertTrue( $capabilities->get()['flexibleContent'] );
	}
}
