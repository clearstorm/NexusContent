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

	/**
	 * @return array<string, array{0:string, 1:string}>
	 */
	public static function submenu_provider(): array {
		return array(
			'editor modes' => array( 'nexuscontent-editor-modes', 'manage_options' ),
			'rest routes'  => array( 'nexuscontent-rest-routes', 'manage_options' ),
			'components'   => array( 'nexuscontent-components', 'manage_options' ),
			'contract'     => array( 'nexuscontent-contract', 'manage_options' ),
			'settings'     => array( 'nexuscontent-settings', 'edit_posts' ),
			'about'        => array( 'nexuscontent-about', 'manage_options' ),
		);
	}

	/**
	 * @dataProvider submenu_provider
	 */
	public function test_add_menu_creates_submenu( string $slug, string $capability ): void {
		$this->admin_page->add_menu();
		$menus = $GLOBALS['nc_test']['menus'] ?? array();
		self::assertArrayHasKey( $slug, $menus );
		self::assertSame( $capability, $menus[ $slug ]['capability'] );
		self::assertSame( 'nexuscontent', $menus[ $slug ]['parent_slug'] );
	}

	/* ----------------------------------------------------------------
	 * Enqueue styles
	 * --------------------------------------------------------------- */

	public function test_enqueue_styles_loads_on_dashboard_page(): void {
		$GLOBALS['nc_test']['styles'] = array();
		$this->admin_page->enqueue_styles( 'toplevel_page_nexuscontent' );
		self::assertContains( 'nexuscontent-admin', $GLOBALS['nc_test']['styles'] );
	}

	/**
	 * @return array<string, array<int, string>>
	 */
	public static function submenu_slug_provider(): array {
		$slugs = array();
		foreach ( self::submenu_provider() as $key => $meta ) {
			$slugs[ $key ] = array( $meta[0] );
		}
		return $slugs;
	}

	/**
	 * @dataProvider submenu_slug_provider
	 */
	public function test_enqueue_styles_loads_on_each_submenu_hook( string $slug ): void {
		foreach ( array( 'nexuscontent_page_' . $slug, 'admin_page_' . $slug ) as $hook ) {
			$GLOBALS['nc_test']['styles'] = array();
			$this->admin_page->enqueue_styles( $hook );
			self::assertContains( 'nexuscontent-admin', $GLOBALS['nc_test']['styles'], $hook );
		}
	}

	public function test_enqueue_styles_accepts_legacy_settings_hook(): void {
		$GLOBALS['nc_test']['styles'] = array();
		$this->admin_page->enqueue_styles( 'settings_page_nexuscontent-settings' );
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

	public function test_breakdown_includes_pages_and_posts_without_explicit_meta(): void {
		$GLOBALS['nc_test']['query_posts'] = array( 10, 20 );
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'Block editor', $rendered );
		self::assertStringContainsString( '2', $rendered );
	}

	public function test_breakdown_queries_pages_and_posts(): void {
		$GLOBALS['nc_test']['query_posts'] = array( 10, 20 );
		$GLOBALS['nc_test']['meta']       = array();

		$this->render_dashboard();
		$breakdown_args = array_filter(
			$GLOBALS['nc_test']['query_args'] ?? array(),
			static fn( array $args ): bool => ( $args['fields'] ?? '' ) === 'ids'
		);
		self::assertCount( 1, $breakdown_args );
		self::assertSame( array( 'page', 'post' ), array_values( reset( $breakdown_args )['post_type'] ) );
	}

	public function test_breakdown_counts_all_valid_modes(): void {
		$GLOBALS['nc_test']['query_posts'] = array( 10, 20, 30 );
		$GLOBALS['nc_test']['meta']        = array(
			10 => array( Editor_Mode::META_KEY => 'gutenberg' ),
			20 => array( Editor_Mode::META_KEY => 'acf_flexible' ),
			30 => array( Editor_Mode::META_KEY => 'acf_fixed' ),
		);

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'Block editor', $rendered );
		self::assertStringContainsString( 'ACF flexible sections', $rendered );
		self::assertStringContainsString( 'ACF fixed fields', $rendered );
		self::assertStringContainsString( 'nc-bar-fill--gutenberg', $rendered );
		self::assertStringContainsString( 'nc-bar-fill--acf_flexible', $rendered );
		self::assertStringContainsString( 'nc-bar-fill--acf_fixed', $rendered );
	}

	public function test_breakdown_defaults_invalid_meta_to_gutenberg(): void {
		$GLOBALS['nc_test']['query_posts'] = array( 10, 20 );
		$GLOBALS['nc_test']['meta']        = array(
			10 => array( Editor_Mode::META_KEY => 'invalid_mode' ),
		);

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( '2', $rendered );
	}

	public function test_breakdown_empty_when_no_content(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'No published content found', $rendered );
	}

	/* ----------------------------------------------------------------
	 * Dashboard — stat cards
	 * --------------------------------------------------------------- */

	public function test_dashboard_contains_stat_cards(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'System health', $rendered );
		self::assertStringContainsString( 'Operational', $rendered );
		self::assertStringContainsString( 'Contract drift', $rendered );
		self::assertStringContainsString( 'Secured routes', $rendered );
	}

	public function test_dashboard_contains_quick_links_card(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'Quick links', $rendered );
		self::assertStringContainsString( 'Editor Modes', $rendered );
		self::assertStringContainsString( 'REST Routes', $rendered );
		self::assertStringContainsString( 'Components', $rendered );
		self::assertStringContainsString( 'Contract', $rendered );
		self::assertStringContainsString( 'Settings', $rendered );
	}

	public function test_dashboard_contains_sections_overview_card(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'Sections (', $rendered );
		self::assertStringContainsString( 'of', $rendered );
		self::assertStringContainsString( 'enabled)', $rendered );
		self::assertStringContainsString( 'nc-chip--on', $rendered );
		self::assertStringNotContainsString( 'nc-chip--off', $rendered );
	}

	public function test_dashboard_contains_recent_pages_card(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'Recent content', $rendered );
	}

	public function test_dashboard_contains_routes_card(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'Routes', $rendered );
		self::assertStringContainsString( 'nexuscontent/v1/pages', $rendered );
	}

	public function test_dashboard_project_contract_card_shows_empty_state_without_contract(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();
		unset( $GLOBALS['nc_test']['options']['nexuscontent_settings'] );

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'Project contract', $rendered );
		self::assertStringContainsString( 'No project contract received yet', $rendered );
	}

	public function test_dashboard_project_contract_card_shows_drift_and_disabled_types(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();
		$GLOBALS['nc_test']['options']['nexuscontent_settings'] = array(
			'enabled_sections' => array( 'hero', 'cta' ),
			'project_components' => array(
				'components'   => array( 'hero', 'custom_thing' ),
				'sectionTypes' => array( 'hero', 'image_text', 'copyright' ),
			),
		);

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'Project contract', $rendered );
		self::assertStringContainsString( 'Missing from install', $rendered );
		self::assertStringContainsString( 'copyright', $rendered );
		self::assertStringContainsString( 'Disabled in settings', $rendered );
		self::assertStringContainsString( 'Image and Text', $rendered );
	}

	public function test_dashboard_does_not_contain_settings_form(): void {
		$GLOBALS['nc_test']['query_posts'] = array();
		$GLOBALS['nc_test']['meta']       = array();

		$rendered = $this->render_dashboard();
		self::assertStringNotContainsString( 'Save settings', $rendered );
		self::assertStringNotContainsString( 'Default editor mode', $rendered );
	}

	/* ----------------------------------------------------------------
	 * Dashboard — recent content modes
	 * --------------------------------------------------------------- */

	public function test_recent_content_shows_mode_badge(): void {
		$GLOBALS['nc_test']['query_posts'] = array( 10 );
		$GLOBALS['nc_test']['meta']        = array(
			10 => array( Editor_Mode::META_KEY => 'acf_fixed' ),
		);

		$rendered = $this->render_dashboard();
		self::assertStringContainsString( 'nc-badge--acf_fixed', $rendered );
		self::assertStringContainsString( 'ACF fixed fields', $rendered );
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
		self::assertStringContainsString( 'General configuration', $rendered );
		self::assertStringContainsString( 'Integrations', $rendered );
	}

	public function test_settings_page_shows_toggle_switches(): void {
		$this->admin_page->register_settings();
		$rendered = $this->render_settings_page();
		self::assertStringContainsString( 'nc-admin-toggle', $rendered );
		self::assertStringContainsString( 'nc-admin-toggle-track', $rendered );
		self::assertStringContainsString( 'nc-admin-toggle-thumb', $rendered );
	}

	/* ----------------------------------------------------------------
	 * Editor Modes page
	 * --------------------------------------------------------------- */

	public function test_editor_modes_page_shows_available_and_unavailable_modes(): void {
		$rendered = $this->render_editor_modes_page();
		self::assertStringContainsString( 'Available editor modes', $rendered );
		self::assertStringContainsString( 'Block editor', $rendered );
		self::assertStringContainsString( 'ACF flexible sections', $rendered );
		self::assertStringContainsString( 'ACF fixed fields', $rendered );
		// Gutenberg is supported in the stubbed environment; ACF is not.
		self::assertStringContainsString( 'nc-mode--on', $rendered );
		self::assertStringContainsString( 'nc-mode--off', $rendered );
		self::assertStringContainsString( 'Available', $rendered );
		self::assertStringContainsString( 'Unavailable', $rendered );
	}

	public function test_editor_modes_page_marks_global_default(): void {
		$rendered = $this->render_editor_modes_page();
		self::assertStringContainsString( 'Default', $rendered );
	}

	public function test_editor_modes_page_shows_distribution_and_acf_health(): void {
		$GLOBALS['nc_test']['query_posts'] = array( 10 );
		$GLOBALS['nc_test']['meta']        = array();
		$rendered = $this->render_editor_modes_page();

		self::assertStringContainsString( 'Published content distribution', $rendered );
		self::assertStringContainsString( 'ACF health', $rendered );
		self::assertStringContainsString( 'ACF detected', $rendered );
		self::assertStringContainsString( 'Flexible content', $rendered );
	}

	/* ----------------------------------------------------------------
	 * REST Routes page
	 * --------------------------------------------------------------- */

	public function test_rest_routes_page_lists_all_endpoints(): void {
		$rendered = $this->render_rest_routes_page();
		self::assertStringContainsString( 'Endpoints', $rendered );
		self::assertStringContainsString( 'nexuscontent/v1/pages', $rendered );
		self::assertStringContainsString( 'nexuscontent/v1/pages/slug/{slug}', $rendered );
		self::assertStringContainsString( 'nexuscontent/v1/project-contract', $rendered );
		self::assertStringContainsString( 'nexuscontent/v1/preview/{token}/{id}', $rendered );
	}

	public function test_rest_routes_page_shows_method_and_permission_badges(): void {
		$rendered = $this->render_rest_routes_page();
		self::assertStringContainsString( 'GET', $rendered );
		self::assertStringContainsString( 'POST', $rendered );
		self::assertStringContainsString( 'Public', $rendered );
		self::assertStringContainsString( 'Privileged', $rendered );
		self::assertStringContainsString( 'Admin only', $rendered );
	}

	public function test_rest_routes_page_shows_envelope_and_capabilities(): void {
		$rendered = $this->render_rest_routes_page();
		self::assertStringContainsString( 'Response envelope', $rendered );
		self::assertStringContainsString( 'contractVersion', $rendered );
		self::assertStringContainsString( 'Runtime capability report', $rendered );
		self::assertStringContainsString( 'wordpressVersion', $rendered );
	}

	/* ----------------------------------------------------------------
	 * Components page
	 * --------------------------------------------------------------- */

	public function test_components_page_shows_registry_rows(): void {
		$rendered = $this->render_components_page();
		self::assertStringContainsString( 'Section registry', $rendered );
		self::assertStringContainsString( 'Hero', $rendered );
		self::assertStringContainsString( 'Introduction', $rendered );
		self::assertStringContainsString( 'Call to Action', $rendered );
		self::assertStringContainsString( 'Form Embed', $rendered );
	}

	public function test_components_page_shows_kind_sources_and_status(): void {
		$rendered = $this->render_components_page();
		self::assertStringContainsString( 'Fixed', $rendered );
		self::assertStringContainsString( 'Flexible', $rendered );
		self::assertStringContainsString( 'Gutenberg', $rendered );
		self::assertStringContainsString( 'ACF Free', $rendered );
		self::assertStringContainsString( 'ACF Pro', $rendered );
		self::assertStringContainsString( 'Enabled', $rendered );
	}

	public function test_components_page_shows_field_schemas(): void {
		$rendered = $this->render_components_page();
		self::assertStringContainsString( 'Field schemas', $rendered );
		self::assertStringContainsString( 'heading', $rendered );
		self::assertStringContainsString( 'buttons', $rendered );
	}

	/* ----------------------------------------------------------------
	 * Contract page
	 * --------------------------------------------------------------- */

	public function test_contract_page_shows_empty_state_without_contract(): void {
		unset( $GLOBALS['nc_test']['options']['nexuscontent_settings'] );
		$rendered = $this->render_contract_page();
		self::assertStringContainsString( 'Contract status', $rendered );
		self::assertStringContainsString( 'No project contract received yet', $rendered );
		self::assertStringContainsString( 'Counts', $rendered );
	}

	public function test_contract_page_shows_contract_counts(): void {
		$GLOBALS['nc_test']['options']['nexuscontent_settings'] = array(
			'enabled_sections'  => array( 'hero', 'cta' ),
			'project_components' => array(
				'components'   => array( 'hero', 'custom_thing' ),
				'sectionTypes' => array( 'hero', 'image_text', 'copyright' ),
			),
		);
		$rendered = $this->render_contract_page();
		self::assertStringContainsString( 'Contract status', $rendered );
		self::assertStringContainsString( '2', $rendered );
		self::assertStringContainsString( '3', $rendered );
	}

	public function test_contract_page_shows_drift_table(): void {
		$GLOBALS['nc_test']['options']['nexuscontent_settings'] = array(
			'enabled_sections'  => array( 'hero', 'cta' ),
			'project_components' => array(
				'components'   => array( 'hero', 'custom_thing' ),
				'sectionTypes' => array( 'hero', 'image_text', 'copyright' ),
			),
		);
		$rendered = $this->render_contract_page();
		self::assertStringContainsString( 'Drift analysis', $rendered );
		self::assertStringContainsString( 'Valid', $rendered );
		self::assertStringContainsString( 'Missing from install', $rendered );
		self::assertStringContainsString( 'copyright', $rendered );
		self::assertStringContainsString( 'Disabled in settings', $rendered );
		self::assertStringContainsString( 'Available but unused', $rendered );
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

	private function render_editor_modes_page(): string {
		$GLOBALS['nc_test']['caps']['manage_options'] = true;
		ob_start();
		try {
			$this->admin_page->render_editor_modes_page();
			$content = ob_get_clean();
		} catch ( \Throwable $e ) {
			ob_end_clean();
			throw $e;
		}
		return $content;
	}

	private function render_rest_routes_page(): string {
		$GLOBALS['nc_test']['caps']['manage_options'] = true;
		ob_start();
		try {
			$this->admin_page->render_rest_routes_page();
			$content = ob_get_clean();
		} catch ( \Throwable $e ) {
			ob_end_clean();
			throw $e;
		}
		return $content;
	}

	private function render_components_page(): string {
		$GLOBALS['nc_test']['caps']['manage_options'] = true;
		ob_start();
		try {
			$this->admin_page->render_components_page();
			$content = ob_get_clean();
		} catch ( \Throwable $e ) {
			ob_end_clean();
			throw $e;
		}
		return $content;
	}

	private function render_contract_page(): string {
		$GLOBALS['nc_test']['caps']['manage_options'] = true;
		ob_start();
		try {
			$this->admin_page->render_contract_page();
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