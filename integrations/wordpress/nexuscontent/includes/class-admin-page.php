<?php
/**
 * NexusContent admin pages: dashboard, editor modes, REST routes, components,
 * contract, settings, and about.
 *
 * @package NexusContentCompanion
 */

namespace NexusContent\Companion;

use WP_Query;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Admin_Page {
	private const OPTION_GROUP         = 'nexuscontent_settings';
	private const OPTION_DEFAULT       = 'nexuscontent_settings';
	private const MENU_SLUG            = 'nexuscontent';
	private const EDITOR_MODES_SLUG    = 'nexuscontent-editor-modes';
	private const REST_ROUTES_SLUG     = 'nexuscontent-rest-routes';
	private const COMPONENTS_SLUG      = 'nexuscontent-components';
	private const CONTRACT_SLUG        = 'nexuscontent-contract';
	private const SETTINGS_SLUG        = 'nexuscontent-settings';
	private const ABOUT_SLUG           = 'nexuscontent-about';
	private const REPO_BASE_URL        = 'https://github.com/anomalyco/nexuscontent';
	private const SECTION_GENERAL      = 'nexuscontent_general';
	private const SECTION_INTEGRATIONS = 'nexuscontent_integrations';

	/**
	 * Display-only mirror of the routes registered by REST_Controller.
	 *
	 * Keep in sync with class-rest-controller.php. Permission reflects the
	 * public/permission contract of each route: plain public reads, privileged
	 * reads (draft access needs edit caps), editor-only token minting, and the
	 * admin-only contract push.
	 *
	 * @var array<int, array<string, string>>
	 */
	private const ROUTES = array(
		array(
			'method'     => 'GET',
			'path'       => '/pages',
			'permission' => 'privileged',
			'handler'    => 'get_pages',
			'summary'    => 'List normalized published pages with pagination, search, and filters.',
		),
		array(
			'method'     => 'GET',
			'path'       => '/pages/{id}',
			'permission' => 'privileged',
			'handler'    => 'get_page',
			'summary'    => 'Normalized page by numeric ID.',
		),
		array(
			'method'     => 'GET',
			'path'       => '/pages/slug/{slug}',
			'permission' => 'privileged',
			'handler'    => 'get_page_by_slug',
			'summary'    => 'Normalized page by slug.',
		),
		array(
			'method'     => 'GET',
			'path'       => '/posts',
			'permission' => 'privileged',
			'handler'    => 'get_pages',
			'summary'    => 'List normalized published posts with pagination, search, and filters.',
		),
		array(
			'method'     => 'GET',
			'path'       => '/posts/{id}',
			'permission' => 'privileged',
			'handler'    => 'get_page',
			'summary'    => 'Normalized post by numeric ID.',
		),
		array(
			'method'     => 'GET',
			'path'       => '/posts/slug/{slug}',
			'permission' => 'privileged',
			'handler'    => 'get_page_by_slug',
			'summary'    => 'Normalized post by slug.',
		),
		array(
			'method'     => 'GET',
			'path'       => '/schema',
			'permission' => 'public',
			'handler'    => 'get_schema',
			'summary'    => 'Canonical section definitions, editor-mode support, and source mappings.',
		),
		array(
			'method'     => 'GET',
			'path'       => '/capabilities',
			'permission' => 'public',
			'handler'    => 'get_capabilities',
			'summary'    => 'Runtime capability report without admin-only projections.',
		),
		array(
			'method'     => 'GET',
			'path'       => '/settings',
			'permission' => 'public',
			'handler'    => 'get_settings',
			'summary'    => 'Normalized site-wide settings for consumer settings models.',
		),
		array(
			'method'     => 'POST',
			'path'       => '/project-contract',
			'permission' => 'admin',
			'handler'    => 'set_project_contract',
			'summary'    => 'Admin-only push of the consumer component contract. Requires manage_options.',
		),
		array(
			'method'     => 'POST',
			'path'       => '/preview-token',
			'permission' => 'editor',
			'handler'    => 'create_preview_token',
			'summary'    => 'Mint a short-lived, post-scoped preview token. Requires edit_posts.',
		),
		array(
			'method'     => 'GET',
			'path'       => '/preview/{token}/{id}',
			'permission' => 'public',
			'handler'    => 'get_preview',
			'summary'    => 'Tokenized draft/scheduled content preview. The token is the authentication.',
		),
	);

	/** @param string $path Optional URL path or fragment appended to the repository base URL. */
	private static function repo_url( string $path = '' ): string {
		return self::REPO_BASE_URL . $path;
	}

	private Capabilities $capabilities;
	private Section_Registry $registry;

	public function __construct( Capabilities $capabilities, Section_Registry $registry ) {
		$this->capabilities = $capabilities;
		$this->registry     = $registry;
	}

	public function register(): void {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_styles' ) );
	}

	public function add_menu(): void {
		add_menu_page(
			__( 'NexusContent', 'nexuscontent' ),
			__( 'NexusContent', 'nexuscontent' ),
			'manage_options',
			self::MENU_SLUG,
			array( $this, 'render_dashboard' ),
			'dashicons-layout',
			80
		);

		$submenus = array(
			self::EDITOR_MODES_SLUG => array( 'Editor Modes', 'render_editor_modes_page', 'manage_options' ),
			self::REST_ROUTES_SLUG  => array( 'REST Routes', 'render_rest_routes_page', 'manage_options' ),
			self::COMPONENTS_SLUG   => array( 'Components', 'render_components_page', 'manage_options' ),
			self::CONTRACT_SLUG     => array( 'Contract', 'render_contract_page', 'manage_options' ),
			self::SETTINGS_SLUG     => array( 'Settings', 'render_settings_page', 'edit_posts' ),
			self::ABOUT_SLUG        => array( 'About', 'render_about_page', 'manage_options' ),
		);

		foreach ( $submenus as $slug => $meta ) {
			list( $label, $renderer, $capability ) = $meta;
			add_submenu_page(
				self::MENU_SLUG,
				/* translators: %s: page label */
				sprintf( __( 'NexusContent %s', 'nexuscontent' ), $label ),
				__( $label, 'nexuscontent' ), // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText
				$capability,
				$slug,
				array( $this, $renderer )
			);
		}
	}

	/**
	 * Accept both the generic custom-menu hook ({parent}_page_{slug}) and the
	 * legacy page-type hook prefixes so styles load regardless of how a host
	 * WordPress build derives the suffix.
	 *
	 * @param string $hook_suffix Current admin page hook suffix.
	 */
	public function enqueue_styles( string $hook_suffix ): void {
		$allowed = array( 'toplevel_page_' . self::MENU_SLUG );
		foreach (
			array(
				self::EDITOR_MODES_SLUG,
				self::REST_ROUTES_SLUG,
				self::COMPONENTS_SLUG,
				self::CONTRACT_SLUG,
				self::SETTINGS_SLUG,
				self::ABOUT_SLUG,
			) as $slug
		) {
			$allowed[] = self::MENU_SLUG . '_page_' . $slug;
			$allowed[] = 'admin_page_' . $slug;
		}
		$allowed[] = 'settings_page_' . self::SETTINGS_SLUG;

		if ( ! in_array( $hook_suffix, $allowed, true ) ) {
			return;
		}
		$plugin_url = plugins_url( 'assets/build/admin.css', NEXUSCONTENT_COMPANION_FILE );
		wp_enqueue_style( 'nexuscontent-admin', $plugin_url, array(), NEXUSCONTENT_COMPANION_VERSION );
	}

	public function register_settings(): void {
		register_setting(
			self::OPTION_GROUP,
			self::OPTION_DEFAULT,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( $this, 'sanitize_settings' ),
				'default'           => $this->default_settings(),
			)
		);

		add_settings_section(
			self::SECTION_GENERAL,
			'',
			'__return_null',
			self::SETTINGS_SLUG
		);
		add_settings_section(
			self::SECTION_INTEGRATIONS,
			'',
			'__return_null',
			self::SETTINGS_SLUG
		);

		add_settings_field(
			'default_editor_mode',
			__( 'Default editor mode', 'nexuscontent' ),
			array( $this, 'render_default_mode_field' ),
			self::SETTINGS_SLUG,
			self::SECTION_GENERAL
		);
		add_settings_field(
			'media_resolution',
			__( 'Media resolution', 'nexuscontent' ),
			array( $this, 'render_media_resolution_field' ),
			self::SETTINGS_SLUG,
			self::SECTION_GENERAL
		);
		add_settings_field(
			'preview_frontend_url',
			__( 'Frontend preview URL', 'nexuscontent' ),
			array( $this, 'render_preview_frontend_url_field' ),
			self::SETTINGS_SLUG,
			self::SECTION_GENERAL
		);

		add_settings_field(
			'enabled_sections',
			__( 'Section types', 'nexuscontent' ),
			array( $this, 'render_enabled_sections_field' ),
			self::SETTINGS_SLUG,
			self::SECTION_INTEGRATIONS
		);
		add_settings_field(
			'webhook_url',
			__( 'Webhook URL', 'nexuscontent' ),
			array( $this, 'render_webhook_url_field' ),
			self::SETTINGS_SLUG,
			self::SECTION_INTEGRATIONS
		);

		register_setting(
			self::OPTION_GROUP,
			Webhook_Dispatcher::OPTION_SECRET,
			array(
				'type'              => 'string',
				'sanitize_callback' => array( $this, 'sanitize_webhook_secret' ),
				'default'           => '',
			)
		);
		add_settings_field(
			'webhook_secret',
			__( 'Webhook secret', 'nexuscontent' ),
			array( $this, 'render_webhook_secret_field' ),
			self::SETTINGS_SLUG,
			self::SECTION_INTEGRATIONS
		);
	}

	/* ----------------------------------------------------------------
	 * Shared chrome
	 * --------------------------------------------------------------- */

	/**
	 * @param string $eyebrow Small label above the title.
	 * @param string $title Page title.
	 * @param string $subtitle One-line summary under the title.
	 */
	private function page_header( string $eyebrow, string $title, string $subtitle ): void {
		?>
		<div class="nc-page-header">
			<div class="nc-page-heading">
				<span class="nc-page-eyebrow"><?php echo esc_html( $eyebrow ); ?></span>
				<h1 class="nc-page-title"><?php echo esc_html( $title ); ?></h1>
				<p class="nc-page-subtitle"><?php echo esc_html( $subtitle ); ?></p>
			</div>
			<div class="nc-page-version">
				<span class="dashicons dashicons-layout"></span>
				<span><?php echo esc_html( NEXUSCONTENT_COMPANION_VERSION ); ?></span>
			</div>
		</div>
		<?php
	}

	/**
	 * @param string $icon Dashicon class (without the dashicons- prefix).
	 * @param string $title Card title.
	 * @param string $action Optional right-aligned action markup.
	 */
	private function card_open( string $icon, string $title, string $action = '' ): void {
		?>
		<div class="nc-card">
			<div class="nc-card-head">
				<span class="dashicons dashicons-<?php echo esc_attr( $icon ); ?>"></span>
				<h2 class="nc-card-title"><?php echo esc_html( $title ); ?></h2>
				<?php if ( '' !== $action ) : ?>
					<div class="nc-card-action"><?php echo $action; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></div>
				<?php endif; ?>
			</div>
			<div class="nc-card-body">
		<?php
	}

	private function card_close(): void {
		?>
			</div>
		</div>
		<?php
	}

	/** @param string $label @param string $tone success|warn|danger|info|muted */
	private function badge( string $label, string $tone ): string {
		return '<span class="nc-badge nc-badge--' . esc_attr( $tone ) . '">' . esc_html( $label ) . '</span>';
	}

	/** @param string $method HTTP method. */
	private function method_badge( string $method ): string {
		$tone = 'POST' === strtoupper( $method ) ? 'danger' : 'info';
		return $this->badge( strtoupper( $method ), $tone );
	}

	/** @param string $permission Route permission key from self::ROUTES. */
	private function permission_badge( string $permission ): string {
		return match ( $permission ) {
			'public'     => $this->badge( __( 'Public', 'nexuscontent' ), 'success' ),
			'privileged' => $this->badge( __( 'Privileged', 'nexuscontent' ), 'warn' ),
			'editor'     => $this->badge( __( 'Editor', 'nexuscontent' ), 'warn' ),
			'admin'      => $this->badge( __( 'Admin only', 'nexuscontent' ), 'danger' ),
			default      => $this->badge( __( 'Unknown', 'nexuscontent' ), 'muted' ),
		};
	}

	/**
	 * @param string $eyebrow
	 * @param string $value
	 * @param string $hint
	 * @param string $icon
	 * @param string $tone
	 */
	private function stat_card( string $eyebrow, string $value, string $hint, string $icon, string $tone ): void {
		?>
		<div class="nc-stat nc-stat--<?php echo esc_attr( $tone ); ?>">
			<div class="nc-stat-top">
				<span class="nc-stat-eyebrow"><?php echo esc_html( $eyebrow ); ?></span>
				<span class="dashicons dashicons-<?php echo esc_attr( $icon ); ?> nc-stat-icon"></span>
			</div>
			<div class="nc-stat-value"><?php echo esc_html( $value ); ?></div>
			<div class="nc-stat-hint"><?php echo esc_html( $hint ); ?></div>
		</div>
		<?php
	}

	/* ----------------------------------------------------------------
	 * Dashboard page
	 * --------------------------------------------------------------- */

	public function render_dashboard(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$capabilities = $this->capabilities->get();
		$breakdown    = $this->content_breakdown();
		$settings     = $this->get_settings();
		$section_defs = $this->registry->definitions();
		$recent       = $this->recent_content();
		$contract     = $this->capabilities->project_contract();
		$drift        = $this->contract_drift( $contract, $settings['enabled_sections'] );
		?>
		<div class="nc-page">
			<?php $this->page_header( 'Companion', __( 'Dashboard', 'nexuscontent' ), __( 'Static status and configuration overview for NexusContent Companion.', 'nexuscontent' ) ); ?>

			<div class="nc-stat-grid">
				<?php
				$health_value = empty( $capabilities['editorModes'] ) ? __( 'Attention', 'nexuscontent' ) : __( 'Operational', 'nexuscontent' );
				$health_tone  = empty( $capabilities['editorModes'] ) ? 'warn' : 'success';
				$this->stat_card( __( 'System health', 'nexuscontent' ), $health_value, __( 'At least one editor mode is available', 'nexuscontent' ), 'admin-plugins', $health_tone );

				if ( null === $contract ) {
					$drift_value = '—';
					$drift_tone  = 'muted';
					$drift_hint  = __( 'No project contract pushed yet', 'nexuscontent' );
				} else {
					$drift_count = $drift['missing'] + $drift['disabled'];
					$drift_value = (string) $drift_count;
					$drift_tone  = $drift_count > 0 ? 'danger' : 'success';
					$drift_hint  = $drift_count > 0 ? __( 'Expected types awaiting alignment', 'nexuscontent' ) : __( 'Expected types aligned with the install', 'nexuscontent' );
				}
				$this->stat_card( __( 'Contract drift', 'nexuscontent' ), $drift_value, $drift_hint, 'networking', $drift_tone );

				$this->stat_card( __( 'Secured routes', 'nexuscontent' ), (string) count( self::ROUTES ), __( 'Contract v1 · nexuscontent/v1', 'nexuscontent' ), 'rest-api', 'info' );
				?>
			</div>

			<div class="nc-layout">
				<div class="nc-main">
					<?php $this->dashboard_card_modes( $breakdown ); ?>
					<?php $this->dashboard_card_recent( $recent ); ?>
					<?php $this->dashboard_card_contract( $contract, $drift, $settings ); ?>
				</div>
				<div class="nc-side">
					<?php $this->dashboard_card_routes(); ?>
					<?php $this->dashboard_card_sections( $section_defs, $settings ); ?>
					<?php $this->dashboard_card_links(); ?>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * @param array<string, int> $breakdown
	 */
	private function dashboard_card_modes( array $breakdown ): void {
		$this->card_open( 'dashboard', __( 'Content by editor mode', 'nexuscontent' ), sprintf( '<a href="%s">%s &rarr;</a>', esc_url( admin_url( 'admin.php?page=' . self::EDITOR_MODES_SLUG ) ), esc_html__( 'Editor Modes', 'nexuscontent' ) ) );
		if ( empty( $breakdown ) ) {
			?>
			<div class="nc-empty">
				<p><?php esc_html_e( 'No published content found.', 'nexuscontent' ); ?></p>
				<p><?php esc_html_e( 'Published pages and posts will appear here once they exist.', 'nexuscontent' ); ?></p>
			</div>
			<?php
		} else {
			$total = (int) array_sum( $breakdown );
			?>
			<div class="nc-bars">
				<?php foreach ( $breakdown as $mode => $count ) : ?>
					<?php $percent = 0 < $total ? (int) round( ( $count / $total ) * 100 ) : 0; ?>
					<div class="nc-bar">
						<div class="nc-bar-row">
							<span class="nc-bar-label"><?php echo esc_html( $this->mode_label( $mode ) ); ?></span>
							<span class="nc-bar-count"><?php echo esc_html( (string) $count ); ?> &middot; <?php echo esc_html( (string) $percent ); ?>%</span>
						</div>
						<div class="nc-bar-track">
							<span class="nc-bar-fill nc-bar-fill--<?php echo esc_attr( $mode ); ?>" style="width:<?php echo esc_attr( (string) $percent ); ?>%"></span>
						</div>
					</div>
				<?php endforeach; ?>
			</div>
			<p class="nc-card-note"><?php esc_html_e( 'NexusContent applies one global default mode; each post can override it in the editor.', 'nexuscontent' ); ?></p>
			<?php
		}
		$this->card_close();
	}

	/** @param array<int, array<string, string>> $pages */
	private function dashboard_card_recent( array $pages ): void {
		$this->card_open( 'clock', __( 'Recent content', 'nexuscontent' ) );
		if ( empty( $pages ) ) {
			?>
			<div class="nc-empty">
				<p><?php esc_html_e( 'No pages found.', 'nexuscontent' ); ?></p>
			</div>
			<?php
		} else {
			?>
			<table class="nc-table">
				<thead>
					<tr>
						<th><?php esc_html_e( 'Content', 'nexuscontent' ); ?></th>
						<th><?php esc_html_e( 'Mode', 'nexuscontent' ); ?></th>
						<th><?php esc_html_e( 'Modified', 'nexuscontent' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ( $pages as $page ) : ?>
						<tr>
							<td>
								<a href="<?php echo esc_url( get_edit_post_link( (int) $page['id'] ) ); ?>">
									<?php echo esc_html( $page['title'] ); ?>
								</a>
							</td>
							<td><span class="nc-badge nc-badge--<?php echo esc_attr( $page['mode'] ); ?>"><?php echo esc_html( $this->mode_label( $page['mode'] ) ); ?></span></td>
							<td class="nc-table-date"><?php echo esc_html( $page['date'] ); ?></td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
			<?php
		}
		$this->card_close();
	}

	/**
	 * @param array<string, array<int, string>>|null $contract
	 * @param array<string, mixed> $drift
	 * @param array<string, mixed> $settings
	 */
	private function dashboard_card_contract( ?array $contract, array $drift, array $settings ): void {
		$action = '';
		if ( null !== $contract ) {
			$action = sprintf( '<a href="%s">%s &rarr;</a>', esc_url( admin_url( 'admin.php?page=' . self::CONTRACT_SLUG ) ), esc_html__( 'Contract', 'nexuscontent' ) );
		}
		$this->card_open( 'networking', __( 'Project contract', 'nexuscontent' ), $action );
		if ( null === $contract ) {
			?>
			<div class="nc-empty">
				<p><?php esc_html_e( 'No project contract received yet.', 'nexuscontent' ); ?></p>
				<p><?php esc_html_e( 'Push the consumer schema through POST /nexuscontent/v1/project-contract to see expected components here.', 'nexuscontent' ); ?></p>
			</div>
			<?php
		} else {
			$this->render_drift_table( $drift );
		}
		$this->card_close();
	}

	private function dashboard_card_routes(): void {
		$this->card_open( 'rest-api', __( 'Routes', 'nexuscontent' ), sprintf( '<a href="%s">%s &rarr;</a>', esc_url( admin_url( 'admin.php?page=' . self::REST_ROUTES_SLUG ) ), esc_html__( 'REST Routes', 'nexuscontent' ) ) );
		?>
		<ul class="nc-route-list">
			<?php foreach ( array_slice( self::ROUTES, 0, 5 ) as $route ) : ?>
				<li class="nc-route-row">
					<?php echo $this->method_badge( $route['method'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					<code class="nc-code nc-code--route"><?php echo esc_html( NEXUSCONTENT_COMPANION_REST_NAMESPACE . $route['path'] ); ?></code>
				</li>
			<?php endforeach; ?>
		</ul>
		<?php
		$this->card_close();
	}

	/**
	 * @param array<string, array<string, mixed>> $section_defs
	 * @param array<string, mixed> $settings
	 */
	private function dashboard_card_sections( array $section_defs, array $settings ): void {
		$enabled   = $settings['enabled_sections'];
		$labels    = self::section_labels();
		$icons     = self::section_icons();
		$count_on  = count( array_intersect( array_keys( $section_defs ), $enabled ) );
		$count_all = count( $section_defs );

		/* translators: 1: enabled section count, 2: total section count. */
		$this->card_open( 'block-default', sprintf( __( 'Sections (%1$d of %2$d enabled)', 'nexuscontent' ), $count_on, $count_all ), sprintf( '<a href="%s">%s &rarr;</a>', esc_url( admin_url( 'admin.php?page=' . self::COMPONENTS_SLUG ) ), esc_html__( 'Components', 'nexuscontent' ) ) );
		if ( ! empty( $section_defs ) ) {
			?>
			<div class="nc-chip-grid">
				<?php foreach ( $section_defs as $type => $definition ) : ?>
					<?php $is_on = in_array( $type, $enabled, true ); ?>
					<span class="nc-chip <?php echo $is_on ? 'nc-chip--on' : 'nc-chip--off'; ?>">
						<span class="dashicons <?php echo esc_attr( $icons[ $type ] ?? 'dashicons-marker' ); ?>"></span>
						<?php echo esc_html( $labels[ $type ] ?? $type ); ?>
					</span>
				<?php endforeach; ?>
			</div>
			<?php
		}
		$this->card_close();
	}

	private function dashboard_card_links(): void {
		$this->card_open( 'admin-links', __( 'Quick links', 'nexuscontent' ) );
		$pages = array(
			array( self::EDITOR_MODES_SLUG, 'screenoptions', __( 'Editor Modes', 'nexuscontent' ) ),
			array( self::REST_ROUTES_SLUG, 'rest-api', __( 'REST Routes', 'nexuscontent' ) ),
			array( self::COMPONENTS_SLUG, 'block-default', __( 'Components', 'nexuscontent' ) ),
			array( self::CONTRACT_SLUG, 'networking', __( 'Contract', 'nexuscontent' ) ),
			array( self::SETTINGS_SLUG, 'admin-settings', __( 'Settings', 'nexuscontent' ) ),
			array( self::ABOUT_SLUG, 'info-outline', __( 'About', 'nexuscontent' ) ),
		);
		?>
		<div class="nc-links">
			<?php foreach ( $pages as $page ) : ?>
				<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . $page[0] ) ); ?>" class="nc-link">
					<span class="dashicons dashicons-<?php echo esc_attr( $page[1] ); ?>"></span>
					<span><?php echo esc_html( $page[2] ); ?></span>
					<span class="dashicons dashicons-arrow-right-alt2"></span>
				</a>
			<?php endforeach; ?>
			<a href="<?php echo esc_url( self::repo_url() ); ?>" target="_blank" rel="noopener noreferrer" class="nc-link">
				<span class="dashicons dashicons-external"></span>
				<span><?php esc_html_e( 'Documentation', 'nexuscontent' ); ?></span>
				<span class="dashicons dashicons-arrow-right-alt2"></span>
			</a>
		</div>
		<?php
		$this->card_close();
	}

	/* ----------------------------------------------------------------
	 * Editor Modes page
	 * --------------------------------------------------------------- */

	public function render_editor_modes_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$capabilities = $this->capabilities->get();
		$settings     = $this->get_settings();
		$breakdown    = $this->content_breakdown();
		?>
		<div class="nc-page">
			<?php $this->page_header( 'Editor Modes', __( 'Editor Modes', 'nexuscontent' ), __( 'How pages and posts are authored: Gutenberg blocks, ACF fixed fields, or ACF flexible sections.', 'nexuscontent' ) ); ?>

			<div class="nc-layout">
				<div class="nc-main">
					<?php
					$this->card_open( 'screenoptions', __( 'Available editor modes', 'nexuscontent' ) );
					$modes = array(
						'gutenberg'    => array( __( 'Block editor', 'nexuscontent' ), __( 'Gutenberg blocks supplied by WordPress. Core content plus the 12 NexusContent section blocks.', 'nexuscontent' ), 'editor-kitchensink' ),
						'acf_flexible' => array( __( 'ACF flexible sections', 'nexuscontent' ), __( 'ACF Pro or Secure Custom Fields flexible layouts for all 12 sections.', 'nexuscontent' ), 'screenoptions' ),
						'acf_fixed'    => array( __( 'ACF fixed fields', 'nexuscontent' ), __( 'ACF Free flat fields for the fixed Hero, Introduction, and Call to Action sections.', 'nexuscontent' ), 'admin-generic' ),
					);
					foreach ( $modes as $mode => $meta ) {
						$supported  = $this->capabilities->supports_mode( $mode );
						$is_default = $settings['default_editor_mode'] === $mode;
						?>
						<div class="nc-mode <?php echo $supported ? 'nc-mode--on' : 'nc-mode--off'; ?>">
							<span class="nc-mode-icon dashicons dashicons-<?php echo esc_attr( $meta[2] ); ?>"></span>
							<div class="nc-mode-body">
								<div class="nc-mode-title">
									<?php echo esc_html( $meta[0] ); ?>
									<?php if ( $is_default ) : ?>
										<?php echo $this->badge( __( 'Default', 'nexuscontent' ), 'success' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
									<?php endif; ?>
								</div>
								<p class="nc-mode-desc"><?php echo esc_html( $meta[1] ); ?></p>
							</div>
							<?php echo $supported ? $this->badge( __( 'Available', 'nexuscontent' ), 'success' ) : $this->badge( __( 'Unavailable', 'nexuscontent' ), 'muted' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						</div>
						<?php
					}
					?>
					<p class="nc-card-note">
						<?php
						printf(
							/* translators: %s: link to settings page */
							esc_html__( 'The global default is applied to new posts that have not selected a mode. %s', 'nexuscontent' ),
							'<a href="' . esc_url( admin_url( 'admin.php?page=' . self::SETTINGS_SLUG ) ) . '">' . esc_html__( 'Change it in Settings', 'nexuscontent' ) . '</a>'
						);
						?>
					</p>
					<?php
					$this->card_close();

					$this->card_open( 'dashboard', __( 'Published content distribution', 'nexuscontent' ) );
					if ( empty( $breakdown ) ) {
						?>
						<div class="nc-empty">
							<p><?php esc_html_e( 'No published content found.', 'nexuscontent' ); ?></p>
						</div>
						<?php
					} else {
						$total = (int) array_sum( $breakdown );
						?>
						<div class="nc-bars">
							<?php foreach ( $breakdown as $mode => $count ) : ?>
								<?php $percent = 0 < $total ? (int) round( ( $count / $total ) * 100 ) : 0; ?>
								<div class="nc-bar">
									<div class="nc-bar-row">
										<span class="nc-bar-label"><?php echo esc_html( $this->mode_label( $mode ) ); ?></span>
										<span class="nc-bar-count"><?php echo esc_html( (string) $count ); ?> &middot; <?php echo esc_html( (string) $percent ); ?>%</span>
									</div>
									<div class="nc-bar-track">
										<span class="nc-bar-fill nc-bar-fill--<?php echo esc_attr( $mode ); ?>" style="width:<?php echo esc_attr( (string) $percent ); ?>%"></span>
									</div>
								</div>
							<?php endforeach; ?>
						</div>
						<?php
					}
					$this->card_close();
					?>
				</div>
				<div class="nc-side">
					<?php $this->card_open( 'admin-plugins', __( 'ACF health', 'nexuscontent' ) ); ?>
					<?php
					$checks = array(
						array( 'editor-kitchensink', __( 'Block editor (Gutenberg)', 'nexuscontent' ), (bool) ( $capabilities['gutenberg'] ?? false ) ),
						array( 'screenoptions', __( 'ACF detected', 'nexuscontent' ), (bool) ( $capabilities['acf'] ?? false ) ),
						array( 'admin-generic', __( 'ACF Pro', 'nexuscontent' ), (bool) ( $capabilities['acfPro'] ?? false ) ),
						array( 'blocks', __( 'ACF blocks', 'nexuscontent' ), (bool) ( $capabilities['acfBlocks'] ?? false ) ),
						array( 'layout', __( 'Flexible content', 'nexuscontent' ), (bool) ( $capabilities['flexibleContent'] ?? false ) ),
					);
					?>
					<ul class="nc-checks">
						<?php foreach ( $checks as $check ) : ?>
							<li class="<?php echo $check[2] ? 'nc-check--ok' : 'nc-check--missing'; ?>">
								<span class="dashicons <?php echo $check[2] ? 'dashicons-yes-alt' : 'dashicons-no-alt'; ?>"></span>
								<span class="nc-check-label"><?php echo esc_html( $check[1] ); ?></span>
								<?php if ( $check[2] ) : ?>
									<span class="nc-check-value"><?php echo esc_html( $this->acf_version_label( $capabilities ) ); ?></span>
								<?php endif; ?>
							</li>
						<?php endforeach; ?>
					</ul>
					<?php
					$this->card_close();
					?>
				</div>
			</div>
		</div>
		<?php
	}

	/* ----------------------------------------------------------------
	 * REST Routes page
	 * --------------------------------------------------------------- */

	public function render_rest_routes_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$capabilities = $this->capabilities->get();
		$public       = 0;
		$privileged   = 0;
		$admin        = 0;
		foreach ( self::ROUTES as $route ) {
			if ( 'public' === $route['permission'] ) {
				++$public;
			} elseif ( in_array( $route['permission'], array( 'privileged', 'editor' ), true ) ) {
				++$privileged;
			} else {
				++$admin;
			}
		}
		?>
		<div class="nc-page">
			<?php $this->page_header( 'REST Routes', __( 'REST Routes', 'nexuscontent' ), __( 'Contract-versioned endpoints under the NexusContent namespace. Content is read-only; the only write route is the admin-only contract push.', 'nexuscontent' ) ); ?>

			<div class="nc-stat-grid nc-stat-grid--4">
				<?php
				$this->stat_card( __( 'Namespace', 'nexuscontent' ), NEXUSCONTENT_COMPANION_REST_NAMESPACE, __( 'Contract v1 envelope', 'nexuscontent' ), 'rest-api', 'info' );
				$this->stat_card( __( 'Endpoints', 'nexuscontent' ), (string) count( self::ROUTES ), __( 'Registered routes', 'nexuscontent' ), 'admin-links', 'info' );
				$this->stat_card( __( 'Public', 'nexuscontent' ), (string) $public, __( 'No authentication required', 'nexuscontent' ), 'visibility', 'success' );
				$this->stat_card( __( 'Privileged', 'nexuscontent' ), (string) $privileged, sprintf( /* translators: %s: admin-only count */ __( '%s admin-only of these', 'nexuscontent' ), $admin ), 'lock', 'warn' );
				?>
			</div>

			<?php
			$this->card_open( 'list-view', __( 'Endpoints', 'nexuscontent' ) );
			?>
			<table class="nc-table">
				<thead>
					<tr>
						<th><?php esc_html_e( 'Method', 'nexuscontent' ); ?></th>
						<th><?php esc_html_e( 'Route', 'nexuscontent' ); ?></th>
						<th><?php esc_html_e( 'Access', 'nexuscontent' ); ?></th>
						<th><?php esc_html_e( 'Purpose', 'nexuscontent' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ( self::ROUTES as $route ) : ?>
						<tr>
							<td><?php echo $this->method_badge( $route['method'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></td>
							<td><code class="nc-code nc-code--route"><?php echo esc_html( NEXUSCONTENT_COMPANION_REST_NAMESPACE . $route['path'] ); ?></code></td>
							<td><?php echo $this->permission_badge( $route['permission'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></td>
							<td class="nc-table-muted"><?php echo esc_html( $route['summary'] ); ?></td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
			<p class="nc-card-note"><?php esc_html_e( 'Public content routes serve published content only. Draft and other non-public visibility inside privileged routes is guarded by WordPress capability checks.', 'nexuscontent' ); ?></p>
			<?php
			$this->card_close();

			$this->card_open( 'format-aside', __( 'Response envelope', 'nexuscontent' ) );
			?>
			<pre class="nc-code nc-code--block">{
	"contractVersion": 1,
	"data": {
	"items": [ { "id": 12, "key": "about", "data": { ... } } ],
	"pagination": { "total": 42, "totalPages": 1 }
	},
	"diagnostics": []
}</pre>
			<p class="nc-card-note"><?php esc_html_e( 'Every contract route wraps its payload in this envelope. Diagnostics are structured entries with severity, code, message, and optional path.', 'nexuscontent' ); ?></p>
			<?php
			$this->card_close();

			$this->card_open( 'admin-plugins', __( 'Runtime capability report', 'nexuscontent' ) );
			$capabilities_json = wp_json_encode( $capabilities, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES );
			$capabilities_json = false === $capabilities_json ? '{}' : $capabilities_json;
			?>
			<pre class="nc-code nc-code--block"><?php echo esc_html( $capabilities_json ); ?></pre>
			<?php
			$this->card_close();
			?>
		</div>
		<?php
	}

	/* ----------------------------------------------------------------
	 * Components page
	 * --------------------------------------------------------------- */

	public function render_components_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$capabilities = $this->capabilities->get();
		$settings     = $this->get_settings();
		$enabled      = $settings['enabled_sections'];
		$section_defs = $this->registry->definitions();
		$labels       = self::section_labels();
		$icons        = self::section_icons();
		$count_on     = count( array_intersect( array_keys( $section_defs ), $enabled ) );
		$count_all    = count( $section_defs );
		?>
		<div class="nc-page">
			<?php $this->page_header( 'Components', __( 'Components', 'nexuscontent' ), __( 'The canonical 12-section vocabulary served to consumers and available in the editor.', 'nexuscontent' ) ); ?>

			<div class="nc-layout">
				<div class="nc-main">
					<?php
					$this->card_open( 'block-default', __( 'Section registry', 'nexuscontent' ) );
					if ( empty( $section_defs ) ) {
						?>
						<div class="nc-empty">
							<p><?php esc_html_e( 'No sections are registered. Ensure sections.json ships with the plugin.', 'nexuscontent' ); ?></p>
						</div>
						<?php
					} else {
						?>
						<table class="nc-table">
							<thead>
								<tr>
									<th><?php esc_html_e( 'Section', 'nexuscontent' ); ?></th>
									<th><?php esc_html_e( 'Vocabulary', 'nexuscontent' ); ?></th>
									<th><?php esc_html_e( 'Kind', 'nexuscontent' ); ?></th>
									<th><?php esc_html_e( 'Sources', 'nexuscontent' ); ?></th>
									<th><?php esc_html_e( 'Status', 'nexuscontent' ); ?></th>
								</tr>
							</thead>
							<tbody>
								<?php foreach ( $section_defs as $type => $definition ) : ?>
									<?php
									$is_on     = in_array( $type, $enabled, true );
									$is_fixed  = ! empty( $definition['fixed'] );
									$acf_label = $is_fixed ? __( 'ACF Free', 'nexuscontent' ) : __( 'ACF Pro', 'nexuscontent' );
									$acf_ok    = $is_fixed ? (bool) ( $capabilities['acf'] ?? false ) : (bool) ( $capabilities['flexibleContent'] ?? false );
									?>
									<tr>
										<td>
											<span class="nc-section-title">
												<span class="dashicons <?php echo esc_attr( $icons[ $type ] ?? 'dashicons-marker' ); ?>"></span>
												<?php echo esc_html( $labels[ $type ] ?? $type ); ?>
											</span>
										</td>
										<td><code class="nc-code"><?php echo esc_html( $type ); ?></code></td>
										<td><?php echo $is_fixed ? $this->badge( __( 'Fixed', 'nexuscontent' ), 'info' ) : $this->badge( __( 'Flexible', 'nexuscontent' ), 'success' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></td>
										<td>
											<?php echo $this->badge( __( 'Gutenberg', 'nexuscontent' ), ( $capabilities['gutenberg'] ?? false ) ? 'success' : 'muted' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
											<?php echo $this->badge( $acf_label, $acf_ok ? 'success' : 'muted' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
										</td>
										<td><?php echo $is_on ? $this->badge( __( 'Enabled', 'nexuscontent' ), 'success' ) : $this->badge( __( 'Disabled', 'nexuscontent' ), 'muted' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></td>
									</tr>
								<?php endforeach; ?>
							</tbody>
						</table>
						<?php
					}
					$this->card_close();
					?>
				</div>
				<div class="nc-side">
					<?php
					$this->card_open( 'chart-bar', __( 'Coverage', 'nexuscontent' ) );
					?>
					<div class="nc-coverage">
						<div class="nc-coverage-value"><?php echo esc_html( (string) $count_on ); ?><span>/<?php echo esc_html( (string) $count_all ); ?></span></div>
						<p class="nc-coverage-label"><?php esc_html_e( 'sections enabled', 'nexuscontent' ); ?></p>
					</div>
					<div class="nc-bar">
						<div class="nc-bar-track">
							<span class="nc-bar-fill nc-bar-fill--gutenberg" style="width:<?php echo esc_attr( 0 < $count_all ? (string) (int) round( ( $count_on / $count_all ) * 100 ) : 0 ); ?>%"></span>
						</div>
					</div>
					<p class="nc-card-note"><?php esc_html_e( 'All 12 canonical sections are always mapped to the registry. Enabled sections also appear in the Gutenberg inserter.', 'nexuscontent' ); ?></p>
					<?php
					$this->card_close();

					$this->card_open( 'format-aside', __( 'Field schemas', 'nexuscontent' ) );
					?>
					<?php $first_type = array_key_first( $section_defs ); ?>
					<?php foreach ( $section_defs as $type => $definition ) : ?>
						<details class="nc-details" <?php echo $type === $first_type ? 'open' : ''; ?>>
							<summary>
								<span class="nc-section-title">
									<span class="dashicons <?php echo esc_attr( $icons[ $type ] ?? 'dashicons-marker' ); ?>"></span>
									<?php echo esc_html( $labels[ $type ] ?? $type ); ?>
								</span>
								<span class="nc-details-chevron dashicons dashicons-arrow-down-alt2"></span>
							</summary>
							<ul class="nc-schema">
								<?php foreach ( $definition['fields'] as $field ) : ?>
									<li class="nc-schema-row">
										<code class="nc-code"><?php echo esc_html( (string) $field['name'] ); ?></code>
										<span class="nc-badge nc-badge--info"><?php echo esc_html( (string) $field['type'] ); ?></span>
										<?php if ( ! empty( $field['required'] ) ) : ?>
											<span class="nc-badge nc-badge--danger"><?php esc_html_e( 'required', 'nexuscontent' ); ?></span>
										<?php endif; ?>
									</li>
								<?php endforeach; ?>
							</ul>
						</details>
					<?php endforeach; ?>
					<?php
					$this->card_close();
					?>
				</div>
			</div>
		</div>
		<?php
	}

	/* ----------------------------------------------------------------
	 * Contract page
	 * --------------------------------------------------------------- */

	public function render_contract_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$settings = $this->get_settings();
		$contract = $this->capabilities->project_contract();
		$drift    = $this->contract_drift( $contract, $settings['enabled_sections'] );
		?>
		<div class="nc-page">
			<?php $this->page_header( 'Contract', __( 'Contract', 'nexuscontent' ), __( 'The consumer project contract pushed from the frontend, and its drift against this install.', 'nexuscontent' ) ); ?>

			<div class="nc-layout">
				<div class="nc-main">
					<?php
					$this->card_open( 'networking', __( 'Contract status', 'nexuscontent' ) );
					if ( null === $contract ) {
						?>
						<div class="nc-empty">
							<p><?php esc_html_e( 'No project contract received yet.', 'nexuscontent' ); ?></p>
							<p><?php esc_html_e( 'Push the consumer schema through the admin-only POST /nexuscontent/v1/project-contract route (for example with the nexus-contract CLI) to store expected components here.', 'nexuscontent' ); ?></p>
						</div>
						<?php
					} else {
						?>
						<div class="nc-stat-grid">
							<?php
							$this->stat_card( __( 'Components', 'nexuscontent' ), (string) count( $contract['components'] ), __( 'Declared section component types', 'nexuscontent' ), 'block-default', 'info' );
							$this->stat_card( __( 'Section types', 'nexuscontent' ), (string) count( $contract['sectionTypes'] ), __( 'Expected by the consumer', 'nexuscontent' ), 'layout', 'info' );
							$this->stat_card( __( 'Stored', 'nexuscontent' ), __( 'Settings', 'nexuscontent' ), __( 'project_components in nexuscontent_settings', 'nexuscontent' ), 'storage', 'info' );
							?>
						</div>
						<p class="nc-card-note"><?php esc_html_e( 'The stored contract is read-only drift comparison. The plugin never reconfigures its editor settings automatically.', 'nexuscontent' ); ?></p>
						<?php
					}
					$this->card_close();

					if ( null !== $contract ) {
						$drift_total = count( $contract['sectionTypes'] );
						$this->card_open( 'chart-pie', sprintf( /* translators: %d: expected section type count */ __( 'Drift analysis (%d expected)', 'nexuscontent' ), $drift_total ) );
						$this->render_drift_table( $drift );
						$this->card_close();
					}
					?>
				</div>
				<div class="nc-side">
					<?php
					$this->card_open( 'filter', __( 'Counts', 'nexuscontent' ) );
					?>
					<ul class="nc-checks nc-checks--stacked">
						<li class="nc-check--ok">
							<span class="dashicons dashicons-yes-alt"></span>
							<span class="nc-check-label"><?php esc_html_e( 'Expected types', 'nexuscontent' ); ?></span>
							<span class="nc-check-value"><?php echo esc_html( (string) ( null === $contract ? 0 : count( $contract['sectionTypes'] ) ) ); ?></span>
						</li>
						<li class="nc-check--ok">
							<span class="dashicons dashicons-yes-alt"></span>
							<span class="nc-check-label"><?php esc_html_e( 'Mapped', 'nexuscontent' ); ?></span>
							<span class="nc-check-value"><?php echo esc_html( (string) $drift['mapped'] ); ?></span>
						</li>
						<li class="nc-check--missing">
							<span class="dashicons dashicons-no-alt"></span>
							<span class="nc-check-label"><?php esc_html_e( 'Missing from install', 'nexuscontent' ); ?></span>
							<span class="nc-check-value"><?php echo esc_html( (string) $drift['missing'] ); ?></span>
						</li>
						<li class="nc-check--missing">
							<span class="dashicons dashicons-no-alt"></span>
							<span class="nc-check-label"><?php esc_html_e( 'Disabled in settings', 'nexuscontent' ); ?></span>
							<span class="nc-check-value"><?php echo esc_html( (string) $drift['disabled'] ); ?></span>
						</li>
						<?php if ( $drift['unused'] ) : ?>
							<li class="nc-check--ok">
								<span class="dashicons dashicons-admin-loop"></span>
								<span class="nc-check-label"><?php esc_html_e( 'Not used by project', 'nexuscontent' ); ?></span>
								<span class="nc-check-value"><?php echo esc_html( (string) count( $drift['unused'] ) ); ?></span>
							</li>
						<?php endif; ?>
					</ul>
					<?php
					$this->card_close();

					if ( $drift['unused'] ) {
						$this->card_open( 'admin-users', __( 'Available but unused', 'nexuscontent' ) );
						$labels = self::section_labels();
						?>
						<div class="nc-chip-grid">
							<?php foreach ( $drift['unused'] as $type ) : ?>
								<span class="nc-chip nc-chip--off">
									<?php echo esc_html( $labels[ $type ] ?? $type ); ?>
								</span>
							<?php endforeach; ?>
						</div>
						<?php
						$this->card_close();
					}
					?>
				</div>
			</div>
		</div>
		<?php
	}

	/* ----------------------------------------------------------------
	 * Settings page
	 * --------------------------------------------------------------- */

	public function render_settings_page(): void {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return;
		}
		?>
		<div class="nc-page">
			<?php $this->page_header( 'Settings', __( 'Settings', 'nexuscontent' ), __( 'Editor defaults, normalization, preview, and webhook delivery.', 'nexuscontent' ) ); ?>
			<form method="post" action="options.php" class="nc-admin-settings-form">
				<?php settings_fields( self::OPTION_GROUP ); ?>
				<div class="nc-layout">
					<div class="nc-main">
						<div class="nc-card">
							<div class="nc-card-head">
								<span class="dashicons dashicons-admin-generic"></span>
								<h2 class="nc-card-title"><?php esc_html_e( 'General configuration', 'nexuscontent' ); ?></h2>
							</div>
							<div class="nc-card-body">
								<table class="form-table nc-settings-table" role="presentation">
									<?php do_settings_fields( self::SETTINGS_SLUG, self::SECTION_GENERAL ); ?>
								</table>
							</div>
						</div>
						<div class="nc-card">
							<div class="nc-card-head">
								<span class="dashicons dashicons-admin-links"></span>
								<h2 class="nc-card-title"><?php esc_html_e( 'Integrations', 'nexuscontent' ); ?></h2>
							</div>
							<div class="nc-card-body">
								<table class="form-table nc-settings-table" role="presentation">
									<?php do_settings_fields( self::SETTINGS_SLUG, self::SECTION_INTEGRATIONS ); ?>
								</table>
							</div>
						</div>
						<div class="nc-admin-submit">
							<?php submit_button( __( 'Save settings', 'nexuscontent' ) ); ?>
						</div>
					</div>
				</div>
			</form>
		</div>
		<?php
	}

	/* ----------------------------------------------------------------
	 * About page
	 * --------------------------------------------------------------- */

	public function render_about_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="nc-page">
			<?php $this->page_header( 'About', __( 'About NexusContent', 'nexuscontent' ), __( 'Content integration companion for WordPress.', 'nexuscontent' ) ); ?>

			<div class="nc-layout">
				<div class="nc-main">
					<?php
					$this->card_open( 'info-outline', __( 'Overview', 'nexuscontent' ) );
					?>
					<p class="nc-lead"><?php esc_html_e( 'NexusContent is an open-source content abstraction layer that provides a consistent interface between frontend applications and external content sources. This companion plugin normalizes WordPress content for consumption by NexusContent Core.', 'nexuscontent' ); ?></p>
					<h3 class="nc-h3"><?php esc_html_e( 'Requirements', 'nexuscontent' ); ?></h3>
					<ul class="nc-checks nc-checks--stacked">
						<li class="nc-check--ok">
							<span class="dashicons dashicons-yes-alt"></span>
							<span class="nc-check-label"><?php esc_html_e( 'WordPress 6.6 or newer', 'nexuscontent' ); ?></span>
						</li>
						<li class="nc-check--ok">
							<span class="dashicons dashicons-yes-alt"></span>
							<span class="nc-check-label"><?php esc_html_e( 'PHP 8.1 or newer', 'nexuscontent' ); ?></span>
						</li>
						<li class="nc-check--ok">
							<span class="dashicons dashicons-yes-alt"></span>
							<span class="nc-check-label"><?php esc_html_e( 'ACF 6.2+ for fixed and flexible editor modes — optional', 'nexuscontent' ); ?></span>
						</li>
					</ul>
					<?php
					$this->card_close();

					$this->card_open( 'welcome-view-site', __( 'Getting started', 'nexuscontent' ) );
					?>
					<ol class="nc-steps">
						<li><strong><?php esc_html_e( 'Activate the plugin', 'nexuscontent' ); ?></strong><p><?php esc_html_e( 'After installing, activate NexusContent Companion from the Plugins screen.', 'nexuscontent' ); ?></p></li>
						<li>
							<strong><?php esc_html_e( 'Configure your settings', 'nexuscontent' ); ?></strong>
							<p>
								<?php
								printf(
									/* translators: %s: link to settings page */
									esc_html__( 'Go to %s to choose which section types are available and set the default editor mode.', 'nexuscontent' ),
									'<a href="' . esc_url( admin_url( 'admin.php?page=' . self::SETTINGS_SLUG ) ) . '">' . esc_html__( 'Settings', 'nexuscontent' ) . '</a>'
								);
								?>
							</p>
						</li>
						<li><strong><?php esc_html_e( 'Create or edit a page', 'nexuscontent' ); ?></strong><p><?php esc_html_e( 'Open any page in the block editor. The NexusContent panel in the sidebar lets you choose an editor mode.', 'nexuscontent' ); ?></p></li>
						<li><strong><?php esc_html_e( 'Add section blocks', 'nexuscontent' ); ?></strong><p><?php esc_html_e( 'Use the block inserter to add NexusContent sections like Hero, Introduction, Features, and more. Each section has a preview and user-friendly fields.', 'nexuscontent' ); ?></p></li>
						<li><strong><?php esc_html_e( 'Connect your frontend', 'nexuscontent' ); ?></strong><p><?php esc_html_e( 'Point your NexusContent configuration to this WordPress instance. The plugin exposes normalized content through secured REST routes.', 'nexuscontent' ); ?></p></li>
					</ol>
					<?php
					$this->card_close();
					?>
				</div>
				<div class="nc-side">
					<?php
					$this->card_open( 'book-alt', __( 'Documentation and links', 'nexuscontent' ) );
					?>
					<div class="nc-links">
						<?php
						$links = array(
							array( self::repo_url(), 'external', __( 'GitHub repository', 'nexuscontent' ) ),
							array( self::repo_url( '#readme' ), 'media-document', __( 'Documentation', 'nexuscontent' ) ),
							array( self::repo_url( '/blob/main/CHANGELOG.md' ), 'update', __( 'Changelog', 'nexuscontent' ) ),
							array( self::repo_url( '/issues' ), 'sos', __( 'Report an issue', 'nexuscontent' ) ),
						);
						foreach ( $links as $link ) :
							?>
							<a href="<?php echo esc_url( $link[0] ); ?>" target="_blank" rel="noopener noreferrer" class="nc-link">
								<span class="dashicons dashicons-<?php echo esc_attr( $link[1] ); ?>"></span>
								<span><?php echo esc_html( $link[2] ); ?></span>
								<span class="dashicons dashicons-external"></span>
							</a>
						<?php endforeach; ?>
					</div>
					<?php
					$this->card_close();

					$this->card_open( 'star-filled', __( 'Features', 'nexuscontent' ) );
					?>
					<ul class="nc-features">
						<li><span class="dashicons dashicons-block-default"></span><div><strong><?php esc_html_e( '12 Section Blocks', 'nexuscontent' ); ?></strong><p><?php esc_html_e( 'Hero, Introduction, Rich Text, Image and Text, Features, Statistics, Testimonials, Gallery, Call to Action, FAQ, Logo Grid, and Form Embed.', 'nexuscontent' ); ?></p></div></li>
						<li><span class="dashicons dashicons-format-image"></span><div><strong><?php esc_html_e( 'Block Previews', 'nexuscontent' ); ?></strong><p><?php esc_html_e( 'Each block shows a visual preview in the inserter and editor sidebar so non-technical users know what they are adding.', 'nexuscontent' ); ?></p></div></li>
						<li><span class="dashicons dashicons-edit"></span><div><strong><?php esc_html_e( 'User-friendly fields', 'nexuscontent' ); ?></strong><p><?php esc_html_e( 'Rich text, image pickers, repeatable items, and structured controls replace raw JSON or shortcode editing.', 'nexuscontent' ); ?></p></div></li>
						<li><span class="dashicons dashicons-database"></span><div><strong><?php esc_html_e( 'Normalized output', 'nexuscontent' ); ?></strong><p><?php esc_html_e( 'Content is normalized into a consistent structure that NexusContent Core can consume from any frontend.', 'nexuscontent' ); ?></p></div></li>
					</ul>
					<?php
					$this->card_close();
					?>
				</div>
			</div>
		</div>
		<?php
	}

	/* ----------------------------------------------------------------
	 * Settings fields
	 * --------------------------------------------------------------- */

	public function render_default_mode_field(): void {
		$settings = $this->get_settings();
		$current  = $settings['default_editor_mode'];
		$modes    = array(
			'gutenberg'    => __( 'Block editor', 'nexuscontent' ),
			'acf_flexible' => __( 'ACF flexible sections', 'nexuscontent' ),
			'acf_fixed'    => __( 'ACF fixed fields', 'nexuscontent' ),
		);
		?>
		<select name="<?php echo esc_attr( self::OPTION_DEFAULT . '[default_editor_mode]' ); ?>" id="nexuscontent-default-editor-mode">
			<?php foreach ( $modes as $value => $label ) : ?>
				<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $current, $value ); ?> <?php disabled( ! $this->capabilities->supports_mode( $value ) ); ?>>
					<?php echo esc_html( $label ); ?>
				</option>
			<?php endforeach; ?>
		</select>
		<p class="description"><?php esc_html_e( 'Applied to new pages that have not yet selected an editor mode.', 'nexuscontent' ); ?></p>
		<?php
	}

	public function render_enabled_sections_field(): void {
		$settings     = $this->get_settings();
		$enabled      = $settings['enabled_sections'];
		$section_defs = $this->registry->definitions();
		$labels       = self::section_labels();
		$icons        = self::section_icons();
		?>
		<fieldset>
			<legend class="screen-reader-text"><?php esc_html_e( 'Section types', 'nexuscontent' ); ?></legend>
			<div class="nc-admin-toggles-grid">
				<?php foreach ( $section_defs as $type => $definition ) : ?>
					<?php $is_on = in_array( $type, $enabled, true ); ?>
					<div class="nc-admin-toggle-item">
						<label class="nc-admin-toggle" for="nc-section-<?php echo esc_attr( $type ); ?>">
							<input
								type="checkbox"
								id="nc-section-<?php echo esc_attr( $type ); ?>"
								name="<?php echo esc_attr( self::OPTION_DEFAULT . '[enabled_sections][]' ); ?>"
								value="<?php echo esc_attr( $type ); ?>"
								<?php checked( $is_on ); ?>
							>
							<span class="nc-admin-toggle-track">
								<span class="nc-admin-toggle-thumb"></span>
							</span>
							<span class="nc-admin-toggle-label">
								<span class="dashicons <?php echo esc_attr( $icons[ $type ] ?? 'dashicons-marker' ); ?>"></span>
								<?php echo esc_html( $labels[ $type ] ?? $type ); ?>
							</span>
						</label>
					</div>
				<?php endforeach; ?>
			</div>
		</fieldset>
		<p class="description"><?php esc_html_e( 'Disabled blocks are hidden from the Gutenberg block inserter.', 'nexuscontent' ); ?></p>
		<?php
	}

	public function render_media_resolution_field(): void {
		$settings = $this->get_settings();
		$current  = $settings['media_resolution'];
		$options  = array(
			'full'      => __( 'Full size', 'nexuscontent' ),
			'large'     => __( 'Large', 'nexuscontent' ),
			'medium'    => __( 'Medium', 'nexuscontent' ),
			'thumbnail' => __( 'Thumbnail', 'nexuscontent' ),
		);
		?>
		<select name="<?php echo esc_attr( self::OPTION_DEFAULT . '[media_resolution]' ); ?>" id="nexuscontent-media-resolution">
			<?php foreach ( $options as $value => $label ) : ?>
				<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $current, $value ); ?>>
					<?php echo esc_html( $label ); ?>
				</option>
			<?php endforeach; ?>
		</select>
		<p class="description"><?php esc_html_e( 'Image size requested when normalizing media from the REST API.', 'nexuscontent' ); ?></p>
		<?php
	}

	public function render_preview_frontend_url_field(): void {
		$settings = $this->get_settings();
		$current  = $settings['preview_frontend_url'];
		?>
		<input
			type="url"
			name="<?php echo esc_attr( self::OPTION_DEFAULT . '[preview_frontend_url]' ); ?>"
			id="nexuscontent-preview-frontend-url"
			value="<?php echo esc_attr( $current ); ?>"
			class="regular-text"
			placeholder="https://example.com"
		>
		<p class="description"><?php esc_html_e( 'Base URL of the consuming frontend. The Gutenberg preview button opens a tokenized preview URL against this domain.', 'nexuscontent' ); ?></p>
		<?php
	}

	public function render_webhook_url_field(): void {
		$settings = $this->get_settings();
		$current  = $settings['webhook_url'];
		?>
		<input
			type="url"
			name="<?php echo esc_attr( self::OPTION_DEFAULT . '[webhook_url]' ); ?>"
			id="nexuscontent-webhook-url"
			value="<?php echo esc_attr( $current ); ?>"
			class="regular-text"
			placeholder="https://frontend.example.com/_nexus/webhook"
		>
		<p class="description"><?php esc_html_e( 'Outbound endpoint notified on page/post create, update, trash, and restore. Leave empty to disable.', 'nexuscontent' ); ?></p>
		<?php
	}

	public function render_webhook_secret_field(): void {
		?>
		<input
			type="password"
			name="<?php echo esc_attr( Webhook_Dispatcher::OPTION_SECRET ); ?>"
			id="nexuscontent-webhook-secret"
			class="regular-text"
			autocomplete="new-password"
			placeholder="<?php esc_html_e( 'Leave blank to keep the current secret', 'nexuscontent' ); ?>"
		>
		<p class="description"><?php esc_html_e( 'Shared secret used to sign webhook payloads with an HMAC-SHA256 signature. The stored value is never displayed. Leave blank to keep the current secret.', 'nexuscontent' ); ?></p>
		<?php
	}

	/* ----------------------------------------------------------------
	 * Settings logic
	 * --------------------------------------------------------------- */

	/**
	 * @param array<string, mixed> $input
	 * @return array<string, mixed>
	 */
	public function sanitize_settings( $input ): array {
		$defaults = $this->default_settings();
		$input    = is_array( $input ) ? $input : array();

		$valid_modes = Editor_Mode::VALID_MODES;
		$mode        = is_string( $input['default_editor_mode'] ?? null ) ? sanitize_key( $input['default_editor_mode'] ) : $defaults['default_editor_mode'];
		$mode        = in_array( $mode, $valid_modes, true ) ? $mode : $defaults['default_editor_mode'];

		$enabled = isset( $input['enabled_sections'] ) && is_array( $input['enabled_sections'] )
			? array_values( array_intersect( array_keys( $this->registry->definitions() ), array_map( 'sanitize_key', $input['enabled_sections'] ) ) )
			: $defaults['enabled_sections'];

		$resolutions = array( 'full', 'large', 'medium', 'thumbnail' );
		$resolution  = is_string( $input['media_resolution'] ?? null ) ? sanitize_key( $input['media_resolution'] ) : $defaults['media_resolution'];
		$resolution  = in_array( $resolution, $resolutions, true ) ? $resolution : $defaults['media_resolution'];

		// Accept only an absolute http(s) URL or an empty value for previews.
		$preview_url = '';
		if ( isset( $input['preview_frontend_url'] ) && is_string( $input['preview_frontend_url'] ) ) {
			$candidate = esc_url_raw( trim( $input['preview_frontend_url'] ) );
			if ( '' === $candidate || wp_http_validate_url( $candidate ) ) {
				$preview_url = $candidate;
			}
		}

		// Accept only an absolute http(s) URL or an empty value for webhooks.
		$webhook_url = '';
		if ( isset( $input['webhook_url'] ) && is_string( $input['webhook_url'] ) ) {
			$candidate = esc_url_raw( trim( $input['webhook_url'] ) );
			if ( '' === $candidate || wp_http_validate_url( $candidate ) ) {
				$webhook_url = $candidate;
			}
		}

		// Preserve the REST-pushed project contract across a settings form save.
		$project = $this->capabilities->project_contract();

		$result = array(
			'default_editor_mode'  => $mode,
			'enabled_sections'     => $enabled,
			'media_resolution'     => $resolution,
			'preview_frontend_url' => $preview_url,
			'webhook_url'          => $webhook_url,
		);
		if ( null !== $project ) {
			$result['project_components'] = $project;
		}

		return $result;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function get_settings(): array {
		$stored   = get_option( self::OPTION_DEFAULT, array() );
		$stored   = is_array( $stored ) ? $stored : array();
		$defaults = $this->default_settings();

		return array(
			'default_editor_mode'  => is_string( $stored['default_editor_mode'] ?? null ) ? $stored['default_editor_mode'] : $defaults['default_editor_mode'],
			'enabled_sections'     => isset( $stored['enabled_sections'] ) && is_array( $stored['enabled_sections'] ) ? $stored['enabled_sections'] : $defaults['enabled_sections'],
			'media_resolution'     => is_string( $stored['media_resolution'] ?? null ) ? $stored['media_resolution'] : $defaults['media_resolution'],
			'preview_frontend_url' => isset( $stored['preview_frontend_url'] ) && is_string( $stored['preview_frontend_url'] ) ? $stored['preview_frontend_url'] : $defaults['preview_frontend_url'],
			'webhook_url'          => isset( $stored['webhook_url'] ) && is_string( $stored['webhook_url'] ) ? $stored['webhook_url'] : $defaults['webhook_url'],
		);
	}

	/**
	 * Sanitize a submitted webhook secret.
	 *
	 * A blank submission preserves the currently stored secret so the value is
	 * never round-tripped through the browser.
	 *
	 * @param mixed $input Submitted value.
	 * @return string
	 */
	public function sanitize_webhook_secret( $input ): string {
		if ( is_string( $input ) && '' !== trim( $input ) ) {
			return sanitize_text_field( $input );
		}
		$stored = get_option( Webhook_Dispatcher::OPTION_SECRET, '' );
		return is_string( $stored ) ? $stored : '';
	}

	/* ----------------------------------------------------------------
	 * Data assembly
	 * --------------------------------------------------------------- */

	/**
	 * @return array<string, mixed>
	 */
	private function default_settings(): array {
		return array(
			'default_editor_mode'  => Editor_Mode::GUTENBERG,
			'enabled_sections'     => array_keys( $this->registry->definitions() ),
			'media_resolution'     => 'large',
			'preview_frontend_url' => '',
			'webhook_url'          => '',
		);
	}

	/**
	 * @param array<string, array<int, string>>|null $contract
	 * @param array<int, string> $enabled
	 * @return array<string, mixed> keys: rows (list of row maps), missing, disabled, mapped, unused
	 */
	private function contract_drift( ?array $contract, array $enabled ): array {
		$registry_types = array_keys( $this->registry->definitions() );
		$labels         = self::section_labels();
		$rows           = array();
		$missing        = 0;
		$disabled       = 0;
		$mapped         = 0;

		if ( null !== $contract ) {
			foreach ( $contract['sectionTypes'] as $type ) {
				$in_registry = in_array( $type, $registry_types, true );
				$is_enabled  = $in_registry && in_array( $type, $enabled, true );
				if ( ! $in_registry ) {
					$status = 'missing';
					$tone   = 'danger';
					$label  = __( 'Missing from install', 'nexuscontent' );
					++$missing;
				} elseif ( $is_enabled ) {
					$status = 'valid';
					$tone   = 'success';
					$label  = __( 'Valid', 'nexuscontent' );
					++$mapped;
				} else {
					$status = 'disabled';
					$tone   = 'warn';
					$label  = __( 'Disabled in settings', 'nexuscontent' );
					++$disabled;
				}
				$rows[] = array(
					'type'        => $type,
					'name'        => $labels[ $type ] ?? $type,
					'inRegistry'  => $in_registry,
					'enabled'     => $is_enabled,
					'status'      => $status,
					'tone'        => $tone,
					'statusLabel' => $label,
				);
			}
		}

		return array(
			'rows'     => $rows,
			'missing'  => $missing,
			'disabled' => $disabled,
			'mapped'   => $mapped,
			'unused'   => array_values( array_diff( $registry_types, null === $contract ? array() : $contract['sectionTypes'] ) ),
		);
	}

	/** @param array<string, mixed> $drift Output of contract_drift(). */
	private function render_drift_table( array $drift ): void {
		if ( empty( $drift['rows'] ) ) {
			?>
			<div class="nc-empty">
				<p><?php esc_html_e( 'No expected section types yet.', 'nexuscontent' ); ?></p>
			</div>
			<?php
			return;
		}
		?>
		<table class="nc-table">
			<thead>
				<tr>
					<th><?php esc_html_e( 'Section', 'nexuscontent' ); ?></th>
					<th><?php esc_html_e( 'Vocabulary', 'nexuscontent' ); ?></th>
					<th><?php esc_html_e( 'Status', 'nexuscontent' ); ?></th>
				</tr>
			</thead>
			<tbody>
				<?php foreach ( $drift['rows'] as $row ) : ?>
					<tr>
						<td><?php echo esc_html( $row['name'] ); ?></td>
						<td><code class="nc-code"><?php echo esc_html( $row['type'] ); ?></code></td>
						<td><?php echo $this->badge( $row['statusLabel'], $row['tone'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></td>
					</tr>
				<?php endforeach; ?>
			</tbody>
		</table>
		<?php
	}

	/**
	 * @return array<string, int>
	 */
	private function content_breakdown(): array {
		$query = new WP_Query(
			array(
				'post_type'      => array( 'page', 'post' ),
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
			)
		);

		$counts = array();
		foreach ( $query->posts as $post_id ) {
			$mode            = get_post_meta( $post_id, Editor_Mode::META_KEY, true );
			$mode            = is_string( $mode ) && in_array( $mode, Editor_Mode::VALID_MODES, true ) ? $mode : Editor_Mode::GUTENBERG;
			$counts[ $mode ] = ( $counts[ $mode ] ?? 0 ) + 1;
		}

		ksort( $counts );
		return $counts;
	}

	/**
	 * Get the most recently modified published pages and posts.
	 *
	 * @return array<int, array<string, string>>
	 */
	private function recent_content(): array {
		$query = new WP_Query(
			array(
				'post_type'      => array( 'page', 'post' ),
				'post_status'    => 'publish',
				'posts_per_page' => 5,
				'orderby'        => 'modified',
				'order'          => 'DESC',
			)
		);

		$pages = array();
		foreach ( $query->posts as $post ) {
			$mode = get_post_meta( $post->ID, Editor_Mode::META_KEY, true );
			$mode = is_string( $mode ) && in_array( $mode, Editor_Mode::VALID_MODES, true ) ? $mode : Editor_Mode::GUTENBERG;

			$pages[] = array(
				'id'    => (string) $post->ID,
				'title' => get_the_title( $post ),
				'mode'  => $mode,
				'date'  => get_the_date( 'M j, Y', $post ),
			);
		}

		return $pages;
	}

	/** @param array<string, mixed> $capabilities */
	private function acf_version_label( array $capabilities ): string {
		if ( ! empty( $capabilities['acfVersion'] ) ) {
			$label = (string) $capabilities['acfVersion'];
			if ( ! empty( $capabilities['acfPro'] ) ) {
				$label .= ' Pro';
			}
			return $label;
		}
		return __( 'Detected', 'nexuscontent' );
	}

	/**
	 * @param string $mode
	 * @return string
	 */
	private function mode_label( string $mode ): string {
		return match ( $mode ) {
			'gutenberg'    => __( 'Block editor', 'nexuscontent' ),
			'acf_flexible' => __( 'ACF flexible sections', 'nexuscontent' ),
			'acf_fixed'    => __( 'ACF fixed fields', 'nexuscontent' ),
			default        => $mode,
		};
	}

	/**
	 * Canonical section labels.
	 *
	 * @return array<string, string>
	 */
	private static function section_labels(): array {
		$registry = new Section_Registry();
		$labels   = array();
		foreach ( $registry->definitions() as $type => $definition ) {
			$labels[ $type ] = $registry->label( $type );
		}

		return $labels;
	}

	/**
	 * Canonical dashicons for each section type.
	 *
	 * @return array<string, string>
	 */
	private static function section_icons(): array {
		return array(
			'hero'         => 'dashicons-layout',
			'intro'        => 'dashicons-info-outline',
			'rich_text'    => 'dashicons-editor-paragraph',
			'image_text'   => 'dashicons-format-image',
			'features'     => 'dashicons-list-view',
			'statistics'   => 'dashicons-chart-bar',
			'testimonials' => 'dashicons-format-quote',
			'gallery'      => 'dashicons-gallery',
			'cta'          => 'dashicons-megaphone',
			'faq'          => 'dashicons-list-view',
			'logo_grid'    => 'dashicons-building',
			'form_embed'   => 'dashicons-forms',
		);
	}
}