<?php

namespace NexusContent\Companion\Tests\Unit;

require_once dirname( __DIR__ ) . '/bootstrap.php';
require_once dirname( __DIR__ ) . '/TestCase.php';

use NexusContent\Companion\Admin_Page;
use NexusContent\Companion\Capabilities;
use NexusContent\Companion\Editor_Mode;
use NexusContent\Companion\Section_Registry;
use NexusContent\Companion\Tests\TestCase;

final class AdminPageTest extends TestCase {
	private Admin_Page $admin_page;

	protected function setUp(): void {
		parent::setUp();
		$this->admin_page = new Admin_Page( new Capabilities(), new Section_Registry() );
	}

	/* ----------------------------------------------------------------
	 * Registration
	 * --------------------------------------------------------------- */

	public function test_register_adds_admin_menu_hook(): void {
		$this->admin_page->register();
		self::assertNotEmpty( $GLOBALS['nc_test']['actions']['admin_menu'] ?? array() );
	}

	public function test_register_adds_admin_init_hook(): void {
		$this->admin_page->register();
		self::assertNotEmpty( $GLOBALS['nc_test']['actions']['admin_init'] ?? array() );
	}

	public function test_register_adds_admin_enqueue_scripts_hook(): void {
		$this->admin_page->register();
		self::assertNotEmpty( $GLOBALS['nc_test']['actions']['admin_enqueue_scripts'] ?? array() );
	}

	/* ----------------------------------------------------------------
	 * Menu structure
	 * --------------------------------------------------------------- */

	public function test_add_menu_creates_top_level_menu(): void {
		$this->admin_page->add_menu();
		$menus = $GLOBALS['nc_test']['menus'] ?? array();
		self::assertArrayHasKey( 'nexuscontent', $menus );
		self::assertSame( 'NexusContent', $menus['nexuscontent']['menu_title'] );
		self::assertSame( 'manage_options', $menus['nexuscontent']['capability'] );
	}

	public function test_add_menu_creates_settings_submenu(): void {
		$this->admin_page->add_menu();
		$menus = $GLOBALS['nc_test']['menus'] ?? array();
		self::assertArrayHasKey( 'nexuscontent-settings', $menus );
		self::assertSame( 'Settings', $menus['nexuscontent-settings']['menu_title'] );
		self::assertSame( 'edit_posts', $menus['nexuscontent-settings']['capability'] );
		self::assertSame( 'nexuscontent', $menus['nexuscontent-settings']['parent_slug'] );
	}

	public function test_add_menu_creates_about_submenu(): void {
		$this->admin_page->add_menu();
		$menus = $GLOBALS['nc_test']['menus'] ?? array();
		self::assertArrayHasKey( 'nexuscontent-about', $menus );
		self::assertSame( 'About', $menus['nexuscontent-about']['menu_title'] );
		self::assertSame( 'manage_options', $menus['nexuscontent-about']['capability'] );
		self::assertSame( 'nexuscontent', $menus['nexuscontent-about']['parent_slug'] );
	}

	/* ----------------------------------------------------------------
	 * Enqueue styles
	 * --------------------------------------------------------------- */

	public function test_enqueue_styles_loads_on_dashboard_page(): void {
		$GLOBALS['nc_test']['styles'] = array();
		$this->admin_page->enqueue_styles( 'toplevel_page_nexuscontent' );
		self::assertContains( 'nexuscontent-admin', $GLOBALS['nc_test']['styles'] );
	}

	public function test_enqueue_styles_loads_on_settings_page(): void {
		$GLOBALS['nc_test']['styles'] = array();
		$this->admin_page->enqueue_styles( 'settings_page_nexuscontent-settings' );
		self::assertContains( 'nexuscontent-admin', $GLOBALS['nc_test']['styles'] );
	}

	public function test_enqueue_styles_loads_on_about_page(): void {
		$GLOBALS['nc_test']['styles'] = array();
		$this->admin_page->enqueue_styles( 'admin_page_nexuscontent-about' );
		self::assertContains( 'nexuscontent-admin', $GLOBALS['nc_test']['styles'] );
	}

	public function test_enqueue_styles_skips_other_pages(): void {
		$GLOBALS['nc_test']['styles'] = array();
		$this->admin_page->enqueue_styles( 'edit.php' );
		self::assertEmpty( $GLOBALS['nc_test']['styles'] );
	}

	/* ----------------------------------------------------------------
	 * Settings
	 * --------------------------------------------------------------- */

	public function test_register_settings_registers_option(): void {
		$this->admin_page->register_settings();
		self::assertArrayHasKey( 'nexuscontent_settings', $GLOBALS['nc_test']['settings'] ?? array() );
	}

	public function test_default_settings_returns_all_modes_and_sections(): void {
		$settings = $this->admin_page->get_settings();
		self::assertSame( 'gutenberg', $settings['default_editor_mode'] );
		self::assertContains( 'hero', $settings['enabled_sections'] );
		self::assertContains( 'cta', $settings['enabled_sections'] );
		self::assertContains( 'form_embed', $settings['enabled_sections'] );
		self::assertSame( 'large', $settings['media_resolution'] );
	}

	public function test_sanitize_settings_rejects_invalid_mode(): void {
		$clean = $this->admin_page->sanitize_settings( array(
			'default_editor_mode' => 'visual',
			'enabled_sections'    => array( 'hero', 'cta' ),
			'media_resolution'    => 'large',
		) );
		self::assertSame( 'gutenberg', $clean['default_editor_mode'] );
	}

	public function test_sanitize_settings_accepts_valid_mode(): void {
		$clean = $this->admin_page->sanitize_settings( array(
			'default_editor_mode' => 'acf_fixed',
			'enabled_sections'    => array( 'hero' ),
			'media_resolution'    => 'thumbnail',
		) );
		self::assertSame( 'acf_fixed', $clean['default_editor_mode'] );
		self::assertSame( array( 'hero' ), $clean['enabled_sections'] );
		self::assertSame( 'thumbnail', $clean['media_resolution'] );
	}

	public function test_sanitize_settings_rejects_invalid_resolution(): void {
		$clean = $this->admin_page->sanitize_settings( array(
			'default_editor_mode' => 'gutenberg',
			'enabled_sections'    => array(),
			'media_resolution'    => 'original',
		) );
		self::assertSame( 'large', $clean['media_resolution'] );
	}

	public function test_sanitize_settings_handles_non_array_input(): void {
		$clean = $this->admin_page->sanitize_settings( 'invalid' );
		self::assertSame( 'gutenberg', $clean['default_editor_mode'] );
		self::assertSame( 'large', $clean['media_resolution'] );
		self::assertNotEmpty( $clean['enabled_sections'] );
	}

	public function test_sanitize_settings_filters_unknown_sections(): void {
		$clean = $this->admin_page->sanitize_settings( array(
			'default_editor_mode' => 'gutenberg',
			'enabled_sections'    => array( 'hero', 'unknown_type', 'cta' ),
			'media_resolution'    => 'large',
		) );
		self::assertContains( 'hero', $clean['enabled_sections'] );
		self::assertContains( 'cta', $clean['enabled_sections'] );
		self::assertNotContains( 'unknown_type', $clean['enabled_sections'] );
	}

	public function test_get_settings_returns_stored_values_when_available(): void {
		$GLOBALS['nc_test']['options']['nexuscontent_settings'] = array(
			'default_editor_mode' => 'acf_flexible',
			'enabled_sections'    => array( 'hero' ),
			'media_resolution'    => 'small',
		);
		$settings = $this->admin_page->get_settings();
		self::assertSame( 'acf_flexible', $settings['default_editor_mode'] );
		self::assertSame( array( 'hero' ), $settings['enabled_sections'] );
		self::assertSame( 'small', $settings['media_resolution'] );
	}

	/* ----------------------------------------------------------------
	 * Dashboard — page breakdown
	 * --------------------------------------------------------------- */

	public function test_page_breakdown_includes_pages_without_explicit_meta(): void {
		$GLOBALS['nc_test']['query_posts'] = array( 10, 20 );
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'Block editor', $rendered );
		self::assertStringContainsString( '2', $rendered );
	}

	public function test_page_breakdown_counts_all_valid_modes(): void {
		$GLOBALS['nc_test']['query_posts'] = array( 10, 20, 30 );
		$GLOBALS['nc_test']['meta']        = array(
			10 => array( Editor_Mode::META_KEY => 'gutenberg' ),
			20 => array( Editor_Mode::META_KEY => 'acf_flexible' ),
			30 => array( Editor_Mode::META_KEY => 'acf_fixed' ),
		);

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( '1', $rendered );
		self::assertStringContainsString( 'Block editor', $rendered );
		self::assertStringContainsString( 'ACF flexible sections', $rendered );
		self::assertStringContainsString( 'ACF fixed fields', $rendered );
	}

	public function test_page_breakdown_defaults_invalid_meta_to_gutenberg(): void {
		$GLOBALS['nc_test']['query_posts'] = array( 10, 20 );
		$GLOBALS['nc_test']['meta']        = array(
			10 => array( Editor_Mode::META_KEY => 'invalid_mode' ),
		);

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( '2', $rendered );
	}

	public function test_page_breakdown_empty_when_no_pages(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'No pages found', $rendered );
	}

	/* ----------------------------------------------------------------
	 * Dashboard — cards
	 * --------------------------------------------------------------- */

	public function test_dashboard_contains_status_card(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'Plugin Status', $rendered );
		self::assertStringContainsString( 'Plugin version', $rendered );
		self::assertStringContainsString( 'WordPress version', $rendered );
		self::assertStringContainsString( 'PHP version', $rendered );
	}

	public function test_dashboard_contains_breakdown_card(): void {
		$GLOBALS['nc_test']['query_posts'] = array( 10 );
		$GLOBALS['nc_test']['meta']        = array();

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'Pages by editor mode', $rendered );
	}

	public function test_dashboard_contains_blocks_overview_card(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'Blocks (', $rendered );
		self::assertStringContainsString( 'of', $rendered );
		self::assertStringContainsString( 'enabled)', $rendered );
		self::assertStringContainsString( 'Manage in Settings', $rendered );
	}

	public function test_dashboard_contains_recent_pages_card(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'Recent pages', $rendered );
	}

	public function test_dashboard_contains_quick_links_card(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'Quick links', $rendered );
	}

	public function test_dashboard_does_not_contain_settings_form(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		self::assertStringNotContainsString( 'Save settings', $rendered );
		self::assertStringNotContainsString( 'Default editor mode', $rendered );
	}

	/* ----------------------------------------------------------------
	 * Dashboard — blocks overview
	 * --------------------------------------------------------------- */

	public function test_blocks_overview_shows_all_section_types(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'nc-admin-block-item', $rendered );
		self::assertStringContainsString( 'Hero', $rendered );
		self::assertStringContainsString( 'Introduction', $rendered );
		self::assertStringContainsString( 'Call to Action', $rendered );
		self::assertStringContainsString( 'Form Embed', $rendered );
	}

	public function test_blocks_overview_shows_on_off_status(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		// All enabled by default.
		self::assertStringContainsString( 'nc-admin-block-item--on', $rendered );
		self::assertStringNotContainsString( 'nc-admin-block-item--off', $rendered );
	}

	/* ----------------------------------------------------------------
	 * Settings page
	 * --------------------------------------------------------------- */

	public function test_settings_page_outputs_settings_form(): void {
		$this->admin_page->register_settings();
		$rendered = $this->render_settings_page();
		self::assertStringContainsString( 'Settings', $rendered );
		self::assertStringContainsString( 'Save settings', $rendered );
		self::assertStringContainsString( 'Default editor mode', $rendered );
		self::assertStringContainsString( 'Section types', $rendered );
		self::assertStringContainsString( 'Media resolution', $rendered );
	}

	public function test_settings_page_shows_toggle_switches(): void {
		$this->admin_page->register_settings();
		$rendered = $this->render_settings_page();
		self::assertStringContainsString( 'nc-admin-toggle', $rendered );
		self::assertStringContainsString( 'nc-admin-toggle-track', $rendered );
		self::assertStringContainsString( 'nc-admin-toggle-thumb', $rendered );
	}

	/* ----------------------------------------------------------------
	 * About page
	 * --------------------------------------------------------------- */

	public function test_about_page_renders_content(): void {
		$rendered = $this->render_about_page();
		self::assertStringContainsString( 'About NexusContent', $rendered );
		self::assertStringContainsString( 'Requirements', $rendered );
		self::assertStringContainsString( 'Getting started', $rendered );
		self::assertStringContainsString( 'Documentation and links', $rendered );
		self::assertStringContainsString( 'Features', $rendered );
	}

	public function test_about_page_contains_requirements(): void {
		$rendered = $this->render_about_page();
		self::assertStringContainsString( 'WordPress 6.6', $rendered );
		self::assertStringContainsString( 'PHP 8.1', $rendered );
	}

	public function test_about_page_contains_getting_started_steps(): void {
		$rendered = $this->render_about_page();
		self::assertStringContainsString( 'Activate the plugin', $rendered );
		self::assertStringContainsString( 'Configure your settings', $rendered );
		self::assertStringContainsString( 'Create or edit a page', $rendered );
		self::assertStringContainsString( 'Add section blocks', $rendered );
		self::assertStringContainsString( 'Connect your frontend', $rendered );
	}

	public function test_about_page_contains_feature_highlights(): void {
		$rendered = $this->render_about_page();
		self::assertStringContainsString( '12 Section Blocks', $rendered );
		self::assertStringContainsString( 'Block Previews', $rendered );
		self::assertStringContainsString( 'User-friendly fields', $rendered );
		self::assertStringContainsString( 'Normalized output', $rendered );
	}

	public function test_about_page_requires_admin(): void {
		$GLOBALS['nc_test']['caps']['manage_options'] = false;
		ob_start();
		$this->admin_page->render_about_page();
		$content = ob_get_clean();
		self::assertEmpty( $content );
	}

	/* ----------------------------------------------------------------
	 * Helpers
	 * --------------------------------------------------------------- */

	private function render_dashboard(): string {
		$GLOBALS['nc_test']['caps']['manage_options'] = true;
		ob_start();
		try {
			$this->admin_page->render_dashboard();
			$content = ob_get_clean();
		} catch ( \Throwable $e ) {
			ob_end_clean();
			throw $e;
		}
		return $content;
	}

	private function render_settings_page(): string {
		$GLOBALS['nc_test']['caps']['edit_posts'] = true;
		ob_start();
		try {
			$this->admin_page->render_settings_page();
			$content = ob_get_clean();
		} catch ( \Throwable $e ) {
			ob_end_clean();
			throw $e;
		}
		return $content;
	}

	private function render_about_page(): string {
		$GLOBALS['nc_test']['caps']['manage_options'] = true;
		ob_start();
		try {
			$this->admin_page->render_about_page();
			$content = ob_get_clean();
		} catch ( \Throwable $e ) {
			ob_end_clean();
			throw $e;
		}
		return $content;
	}
}
