<?php

namespace NexusContent\Companion\Tests\Unit;

require_once dirname( __DIR__ ) . '/bootstrap.php';
require_once dirname( __DIR__ ) . '/TestCase.php';

use NexusContent\Companion\Diagnostics;
use NexusContent\Companion\Contract;
use NexusContent\Companion\Editor_Mode;
use NexusContent\Companion\Section_Registry;
use NexusContent\Companion\Tests\TestCase;

final class NormalizationEquivalenceTest extends TestCase {
	public function test_all_sections_are_equivalent_across_native_acf_block_and_flexible_sources(): void {
		$GLOBALS['nc_test']['caps']['unfiltered_html'] = true;
		foreach ( Section_Registry::TYPES as $type ) {
			$expected = $this->fixture( $type );
			$source_type = str_replace( '_', '-', $type );

			$post = $this->post();
			$source_data = array_merge( $expected['data'], $expected['settings'] ?? array() );
			$GLOBALS['nc_test']['blocks'] = array( array( 'blockName' => 'nexuscontent/' . $source_type, 'attrs' => $source_data, 'innerHTML' => '', 'innerBlocks' => array() ) );
			$native = $this->canonical( $this->normalizedPage( $post )['sections'][0] );

			$GLOBALS['nc_test']['blocks'] = array( array( 'blockName' => 'acf/' . $source_type, 'attrs' => array( 'data' => $source_data ), 'innerHTML' => '', 'innerBlocks' => array() ) );
			$acf_block = $this->canonical( $this->normalizedPage( $post )['sections'][0] );

			$GLOBALS['nc_test']['meta'][42][ Editor_Mode::META_KEY ] = Editor_Mode::ACF_FLEXIBLE;
			$GLOBALS['nc_test']['fields'][42]['nexus_sections'] = array( array_merge( array( 'acf_fc_layout' => $source_type ), $source_data ) );
			$flexible = $this->canonical( $this->normalizedPage( $post )['sections'][0] );

			self::assertSame( $expected, $native, 'Native mismatch for ' . $type );
			self::assertSame( $expected, $acf_block, 'ACF block mismatch for ' . $type );
			self::assertSame( $expected, $flexible, 'Flexible mismatch for ' . $type );
			\nc_test_reset();
			$GLOBALS['nc_test']['caps']['unfiltered_html'] = true;
		}
	}

	public function test_hero_intro_and_cta_fixed_flat_fields_match_other_sources(): void {
		foreach ( array( 'hero', 'intro', 'cta' ) as $type ) {
			$expected = $this->fixture( $type );
			$post = $this->post();
			$GLOBALS['nc_test']['meta'][42][ Editor_Mode::META_KEY ] = Editor_Mode::ACF_FIXED;
			$GLOBALS['nc_test']['fields'][42][ $type . '_enabled' ] = true;
			foreach ( $expected['data'] as $field => $value ) {
				if ( ! in_array( $field, array( 'variant', 'theme' ), true ) ) {
					$GLOBALS['nc_test']['fields'][42][ $type . '_' . $field ] = $value;
				}
			}
			$sections = $this->normalizedPage( $post, new Diagnostics() )['sections'];
			self::assertCount( 1, $sections, 'Flat fixed fields were not extracted for ' . $type );
			$canonical = $this->canonical( $sections[0] );
			self::assertSame( $type, $canonical['type'] );
			self::assertSame( array_diff_key( $expected['data'], array( 'variant' => true, 'theme' => true ) ), $canonical['data'] );
			\nc_test_reset();
		}
	}

	public function test_fixed_mode_never_merges_inactive_block_or_flexible_content(): void {
		$post = $this->post( array( 'post_content' => '<p>Inactive</p>' ) );
		$GLOBALS['nc_test']['meta'][42][ Editor_Mode::META_KEY ] = Editor_Mode::ACF_FIXED;
		$GLOBALS['nc_test']['fields'][42]['hero_enabled'] = true;
		$GLOBALS['nc_test']['fields'][42]['hero_heading'] = 'Active fixed hero';
		$GLOBALS['nc_test']['fields'][42]['nexus_sections'] = array( array( 'acf_fc_layout' => 'intro', 'text' => 'Inactive flexible' ) );
		$GLOBALS['nc_test']['blocks'] = array( array( 'blockName' => 'core/paragraph', 'attrs' => array(), 'innerHTML' => '<p>Inactive block</p>' ) );
		$diagnostics = new Diagnostics();
		$page = $this->normalizedPage( $post, $diagnostics );
		self::assertSame( array( 'hero' ), array_column( $page['sections'], 'type' ) );
		self::assertStringNotContainsString( 'Inactive', json_encode( $page['sections'], JSON_THROW_ON_ERROR ) );
		self::assertContains( Contract::ERROR_CONFLICTING_SECTION_SOURCES, array_column( $diagnostics->all(), 'code' ) );
	}

	public function test_posts_normalize_sections_like_pages_in_every_editor_mode(): void {
		$GLOBALS['nc_test']['caps']['unfiltered_html'] = true;
		$expected = $this->fixture( 'hero' );
		$source_type = 'hero';

		$post = $this->post( array( 'post_type' => 'post', 'post_name' => 'fixture-post', 'post_title' => 'Fixture post' ) );
		$GLOBALS['nc_test']['blocks'] = array( array( 'blockName' => 'nexuscontent/' . $source_type, 'attrs' => array_merge( $expected['data'], $expected['settings'] ?? array() ), 'innerHTML' => '', 'innerBlocks' => array() ) );
		self::assertSame( $expected, $this->canonical( $this->normalizedPage( $post )['sections'][0] ), 'Gutenberg post sections mismatch' );

		\nc_test_reset();
		$GLOBALS['nc_test']['caps']['unfiltered_html'] = true;
		$post = $this->post( array( 'post_type' => 'post', 'post_name' => 'fixture-post', 'post_title' => 'Fixture post' ) );
		$GLOBALS['nc_test']['meta'][42][ Editor_Mode::META_KEY ] = Editor_Mode::ACF_FLEXIBLE;
		$GLOBALS['nc_test']['fields'][42]['nexus_sections'] = array( array_merge( array( 'acf_fc_layout' => $source_type ), $expected['data'], $expected['settings'] ?? array() ) );
		self::assertSame( $expected, $this->canonical( $this->normalizedPage( $post )['sections'][0] ), 'Flexible post sections mismatch' );

		\nc_test_reset();
		$GLOBALS['nc_test']['caps']['unfiltered_html'] = true;
		$post = $this->post( array( 'post_type' => 'post', 'post_name' => 'fixture-post', 'post_title' => 'Fixture post' ) );
		$GLOBALS['nc_test']['meta'][42][ Editor_Mode::META_KEY ] = Editor_Mode::ACF_FIXED;
		$GLOBALS['nc_test']['fields'][42]['hero_enabled'] = true;
		foreach ( $expected['data'] as $field => $value ) {
			if ( ! in_array( $field, array( 'variant', 'theme' ), true ) ) {
				$GLOBALS['nc_test']['fields'][42][ 'hero_' . $field ] = $value;
			}
		}
		$sections = $this->normalizedPage( $post )['sections'];
		self::assertCount( 1, $sections, 'Fixed post sections were not extracted' );
		self::assertSame( array_diff_key( $expected['data'], array( 'variant' => true, 'theme' => true ) ), $this->canonical( $sections[0] )['data'] );
	}

	public function test_flexible_sections_read_formatted_values_so_names_reach_the_wire(): void {
		$post = $this->post();
		$GLOBALS['nc_test']['meta'][42][ Editor_Mode::META_KEY ] = Editor_Mode::ACF_FLEXIBLE;
		$GLOBALS['nc_test']['fields'][42]['nexus_sections'] = array( array_merge( array( 'acf_fc_layout' => 'hero' ), $this->fixture( 'hero' )['data'] ) );

		$this->normalizedPage( $post );
		$format = $GLOBALS['nc_test']['get_field_formats'][42]['nexus_sections'] ?? null;

		self::assertSame( true, $format, 'flexible_sections() must read the formatted value so ACF returns rows keyed by canonical field names (not field_nc_* keys).' );
	}

	public function test_features_points_flatten_from_repeater_to_flat_strings(): void {
		$post = $this->post();
		$GLOBALS['nc_test']['meta'][42][ Editor_Mode::META_KEY ] = Editor_Mode::ACF_FLEXIBLE;
		$GLOBALS['nc_test']['fields'][42]['nexus_sections'] = array(
			array(
				'acf_fc_layout' => 'features',
				'heading'       => 'Features',
				'items'         => array(
					array(
						'title'       => 'Portable',
						'description' => 'Works across consumers.',
						// The shape real ACF emits for a repeater of a `text` sub-field.
						'points'      => array(
							array( 'text' => 'Framework neutral' ),
							array( 'text' => 'Editor independent' ),
						),
					),
				),
			),
		);

		$sections = $this->normalizedPage( $post )['sections'];
		self::assertCount( 1, $sections );
		self::assertSame( 'features', $sections[0]['type'] );
		self::assertSame( array( 'Framework neutral', 'Editor independent' ), $sections[0]['data']['items'][0]['points'] );
	}

	public function test_features_points_leave_flat_strings_untouched(): void {
		$post = $this->post();
		$GLOBALS['nc_test']['meta'][42][ Editor_Mode::META_KEY ] = Editor_Mode::ACF_FLEXIBLE;
		$GLOBALS['nc_test']['fields'][42]['nexus_sections'] = array(
			array(
				'acf_fc_layout' => 'features',
				'heading'       => 'Features',
				'items'         => array(
					array(
						'title'  => 'Portable',
						'points' => array( 'Framework neutral', 'Editor independent' ),
					),
				),
			),
		);

		$sections = $this->normalizedPage( $post )['sections'];
		self::assertSame( array( 'Framework neutral', 'Editor independent' ), $sections[0]['data']['items'][0]['points'] );
	}
}
