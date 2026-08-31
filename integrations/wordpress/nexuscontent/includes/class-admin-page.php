<?php
/**
 * NexusContent admin pages: dashboard, settings, and about.
 *
 * @package NexusContentCompanion
 */

namespace NexusContent\Companion;

use WP_Query;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Admin_Page {
	private const OPTION_GROUP   = 'nexuscontent_settings';
	private const OPTION_DEFAULT = 'nexuscontent_settings';
	private const MENU_SLUG      = 'nexuscontent';
	private const SETTINGS_SLUG  = 'nexuscontent-settings';
	private const ABOUT_SLUG     = 'nexuscontent-about';
	private const REPO_BASE_URL  = 'https://github.com/anomalyco/nexuscontent';

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

		add_submenu_page(
			self::MENU_SLUG,
			__( 'NexusContent Settings', 'nexuscontent' ),
			__( 'Settings', 'nexuscontent' ),
			'edit_posts',
			self::SETTINGS_SLUG,
			array( $this, 'render_settings_page' )
		);

		add_submenu_page(
			self::MENU_SLUG,
			__( 'NexusContent About', 'nexuscontent' ),
			__( 'About', 'nexuscontent' ),
			'manage_options',
			self::ABOUT_SLUG,
			array( $this, 'render_about_page' )
		);
	}

	/** @param string $hook_suffix Current admin page hook suffix. */
	public function enqueue_styles( string $hook_suffix ): void {
		$allowed = array(
			'toplevel_page_' . self::MENU_SLUG,
			'settings_page_' . self::SETTINGS_SLUG,
			'admin_page_' . self::ABOUT_SLUG,
		);
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
			'nexuscontent_config',
			'',
			'__return_null',
			self::SETTINGS_SLUG
		);

		add_settings_field(
			'default_editor_mode',
			__( 'Default editor mode', 'nexuscontent' ),
			array( $this, 'render_default_mode_field' ),
			self::SETTINGS_SLUG,
			'nexuscontent_config'
		);

		add_settings_field(
			'enabled_sections',
			__( 'Section types', 'nexuscontent' ),
			array( $this, 'render_enabled_sections_field' ),
			self::SETTINGS_SLUG,
			'nexuscontent_config'
		);

		add_settings_field(
			'media_resolution',
			__( 'Media resolution', 'nexuscontent' ),
			array( $this, 'render_media_resolution_field' ),
			self::SETTINGS_SLUG,
			'nexuscontent_config'
		);

		add_settings_field(
			'preview_frontend_url',
			__( 'Frontend preview URL', 'nexuscontent' ),
			array( $this, 'render_preview_frontend_url_field' ),
			self::SETTINGS_SLUG,
			'nexuscontent_config'
		);
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
		?>
		<div class="nc-admin-header">
			<div class="nc-admin-header-icon">
				<span class="dashicons dashicons-layout"></span>
			</div>
			<div class="nc-admin-header-text">
				<h1 class="nc-admin-header-title">
					NexusContent
					<span class="nc-admin-header-version"><?php echo esc_html( NEXUSCONTENT_COMPANION_VERSION ); ?></span>
				</h1>
				<p class="nc-admin-header-subtitle"><?php esc_html_e( 'Content integration companion for WordPress.', 'nexuscontent' ); ?></p>
			</div>
		</div>

		<div class="nc-admin-cards">
			<?php $this->dashboard_card_status( $capabilities, $section_defs ); ?>
			<?php $this->dashboard_card_breakdown( $breakdown ); ?>
			<?php $this->dashboard_card_project_contract( $settings ); ?>
			<?php $this->dashboard_card_blocks( $section_defs, $settings ); ?>
			<?php $this->dashboard_card_recent( $recent ); ?>
			<?php $this->dashboard_card_links(); ?>
		</div>
		<?php
	}

	/**
	 * Plugin Status card.
	 *
	 * @param array<string, mixed> $capabilities
	 * @param array<string, mixed> $section_defs
	 */
	private function dashboard_card_status( array $capabilities, array $section_defs ): void {
		?>
		<div class="nc-admin-card">
			<div class="nc-admin-card-header">
				<span class="dashicons dashicons-admin-plugins"></span>
				<h2 class="nc-admin-card-title"><?php esc_html_e( 'Plugin Status', 'nexuscontent' ); ?></h2>
			</div>
			<div class="nc-admin-card-body">
				<div class="nc-admin-status-grid">
					<div class="nc-admin-status-item">
						<span class="nc-admin-status-label"><?php esc_html_e( 'Plugin version', 'nexuscontent' ); ?></span>
						<span class="nc-admin-status-value"><?php echo esc_html( NEXUSCONTENT_COMPANION_VERSION ); ?></span>
					</div>
					<div class="nc-admin-status-item">
						<span class="nc-admin-status-label"><?php esc_html_e( 'WordPress version', 'nexuscontent' ); ?></span>
						<span class="nc-admin-status-value"><?php echo esc_html( $capabilities['wordpressVersion'] ?? '' ); ?></span>
					</div>
					<div class="nc-admin-status-item">
						<span class="nc-admin-status-label"><?php esc_html_e( 'PHP version', 'nexuscontent' ); ?></span>
						<span class="nc-admin-status-value"><?php echo esc_html( phpversion() ); ?></span>
					</div>
					<div class="nc-admin-status-item">
						<span class="nc-admin-status-label"><?php esc_html_e( 'ACF', 'nexuscontent' ); ?></span>
						<span class="nc-admin-status-value">
							<?php if ( ! empty( $capabilities['acf'] ) ) : ?>
								<span class="nc-admin-indicator">
									<span class="nc-admin-indicator-dot nc-admin-indicator-dot--green"></span>
								</span>
								<?php
								$acf_version = $capabilities['acfVersion'] ?? '';
								$pro_label   = ! empty( $capabilities['acfPro'] ) ? ' (Pro)' : '';
								echo esc_html( $acf_version . $pro_label );
								?>
							<?php else : ?>
								<span class="nc-admin-indicator">
									<span class="nc-admin-indicator-dot nc-admin-indicator-dot--muted"></span>
								</span>
								<?php esc_html_e( 'Not detected', 'nexuscontent' ); ?>
							<?php endif; ?>
						</span>
					</div>
					<div class="nc-admin-status-item">
						<span class="nc-admin-status-label"><?php esc_html_e( 'Editor modes', 'nexuscontent' ); ?></span>
						<span class="nc-admin-status-value">
							<?php
							$modes = $capabilities['editorModes'] ?? array();
							if ( empty( $modes ) ) {
								echo '<span class="nc-admin-mode-badge nc-admin-mode-badge--muted">' . esc_html__( 'None', 'nexuscontent' ) . '</span>';
							} else {
								foreach ( $modes as $mode ) {
									$badge_class = 'nc-admin-mode-badge--' . $mode;
									printf(
										'<span class="nc-admin-mode-badge %s">%s</span> ',
										esc_attr( $badge_class ),
										esc_html( $this->mode_label( $mode ) )
									);
								}
							}
							?>
						</span>
					</div>
					<div class="nc-admin-status-item">
						<span class="nc-admin-status-label"><?php esc_html_e( 'Section types', 'nexuscontent' ); ?></span>
						<span class="nc-admin-status-value"><?php echo esc_html( (string) count( $section_defs ) ); ?></span>
					</div>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Published pages and posts by editor mode card.
	 *
	 * @param array<string, int> $breakdown
	 */
	private function dashboard_card_breakdown( array $breakdown ): void {
		?>
		<div class="nc-admin-card">
			<div class="nc-admin-card-header">
				<span class="dashicons dashicons-admin-page"></span>
				<h2 class="nc-admin-card-title"><?php esc_html_e( 'Content by editor mode', 'nexuscontent' ); ?></h2>
			</div>
			<div class="nc-admin-card-body">
				<?php if ( ! empty( $breakdown ) ) : ?>
					<div class="nc-admin-breakdown">
						<?php foreach ( $breakdown as $mode => $count ) : ?>
							<div class="nc-admin-breakdown-item">
								<span class="nc-admin-breakdown-count"><?php echo esc_html( (string) $count ); ?></span>
								<span class="nc-admin-breakdown-label"><?php echo esc_html( $this->mode_label( $mode ) ); ?></span>
							</div>
						<?php endforeach; ?>
					</div>
				<?php else : ?>
					<div class="nc-admin-empty-state">
						<p><?php esc_html_e( 'No published content found.', 'nexuscontent' ); ?></p>
						<p><?php esc_html_e( 'Published pages and posts will appear here once they exist.', 'nexuscontent' ); ?></p>
					</div>
				<?php endif; ?>
			</div>
		</div>
		<?php
	}

	/**
	 * Blocks overview card with enabled/disabled status.
	 *
	 * @param array<string, mixed> $section_defs
	 * @param array<string, mixed> $settings
	 */
	private function dashboard_card_blocks( array $section_defs, array $settings ): void {
		$enabled   = $settings['enabled_sections'];
		$labels    = self::section_labels();
		$icons     = self::section_icons();
		$count_on  = count( array_intersect( array_keys( $section_defs ), $enabled ) );
		$count_all = count( $section_defs );
		?>
		<div class="nc-admin-card">
			<div class="nc-admin-card-header">
				<span class="dashicons dashicons-block-default"></span>
				<h2 class="nc-admin-card-title">
					<?php
					printf(
						/* translators: 1: enabled count, 2: total count */
						esc_html__( 'Blocks (%1$d of %2$d enabled)', 'nexuscontent' ),
						$count_on,
						$count_all
					);
					?>
				</h2>
			</div>
			<div class="nc-admin-card-body">
				<div class="nc-admin-blocks-grid">
					<?php foreach ( $section_defs as $type => $definition ) : ?>
						<?php $is_on = in_array( $type, $enabled, true ); ?>
						<div class="nc-admin-block-item <?php echo $is_on ? 'nc-admin-block-item--on' : 'nc-admin-block-item--off'; ?>">
							<span class="nc-admin-block-icon dashicons <?php echo esc_attr( $icons[ $type ] ?? 'dashicons-marker' ); ?>"></span>
							<span class="nc-admin-block-name"><?php echo esc_html( $labels[ $type ] ?? $type ); ?></span>
							<span class="nc-admin-block-status"><?php echo $is_on ? esc_html__( 'On', 'nexuscontent' ) : esc_html__( 'Off', 'nexuscontent' ); ?></span>
						</div>
					<?php endforeach; ?>
				</div>
				<p class="nc-admin-card-footer">
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::SETTINGS_SLUG ) ); ?>"><?php esc_html_e( 'Manage in Settings', 'nexuscontent' ); ?> &rarr;</a>
				</p>
			</div>
		</div>
		<?php
	}

	/**
	 * Project contract card with drift comparison.
	 *
	 * @param array<string, mixed> $settings
	 */
	private function dashboard_card_project_contract( array $settings ): void {
		$contract = $this->capabilities->project_contract();
		$enabled  = $settings['enabled_sections'];
		?>
		<div class="nc-admin-card">
			<div class="nc-admin-card-header">
				<span class="dashicons dashicons-networking"></span>
				<h2 class="nc-admin-card-title"><?php esc_html_e( 'Project contract', 'nexuscontent' ); ?></h2>
			</div>
			<div class="nc-admin-card-body">
				<?php if ( null === $contract ) : ?>
					<div class="nc-admin-empty-state">
						<p><?php esc_html_e( 'No project contract received yet.', 'nexuscontent' ); ?></p>
						<p><?php esc_html_e( 'Push the consumer schema through POST /nexuscontent/v1/project-contract to see expected components here.', 'nexuscontent' ); ?></p>
					</div>
				<?php else : ?>
					<?php $this->dashboard_project_contract_drift( $contract, $enabled ); ?>
				<?php endif; ?>
			</div>
		</div>
		<?php
	}

	/**
	 * @param array<string, array<int, string>> $contract
	 * @param array<int, string> $enabled
	 */
	private function dashboard_project_contract_drift( array $contract, array $enabled ): void {
		$registry_types = array_keys( $this->registry->definitions() );
		$expected       = $contract['sectionTypes'];
		$missing        = array_values( array_diff( $expected, $registry_types ) );
		$unused         = array_values( array_diff( $registry_types, $expected ) );
		$disabled       = array_values( array_intersect( array_diff( $expected, $missing ), array_diff( $registry_types, $enabled ) ) );
		$labels         = self::section_labels();
		?>
		<p class="description"><?php esc_html_e( 'Expected section types come from the consumer project contract. The plugin never reconfigures itself automatically.', 'nexuscontent' ); ?></p>
		<div class="nc-admin-breakdown">
			<div class="nc-admin-breakdown-item">
				<span class="nc-admin-breakdown-count"><?php echo esc_html( (string) count( $expected ) ); ?></span>
				<span class="nc-admin-breakdown-label"><?php esc_html_e( 'expected', 'nexuscontent' ); ?></span>
			</div>
			<div class="nc-admin-breakdown-item">
				<span class="nc-admin-breakdown-count"><?php echo esc_html( (string) count( $missing ) ); ?></span>
				<span class="nc-admin-breakdown-label"><?php esc_html_e( 'missing from install', 'nexuscontent' ); ?></span>
			</div>
			<div class="nc-admin-breakdown-item">
				<span class="nc-admin-breakdown-count"><?php echo esc_html( (string) count( $disabled ) ); ?></span>
				<span class="nc-admin-breakdown-label"><?php esc_html_e( 'disabled', 'nexuscontent' ); ?></span>
			</div>
		</div>
		<?php if ( $missing || $unused || $disabled ) : ?>
			<ul class="nc-admin-project-drift">
				<?php if ( $missing ) : ?>
					<li>
						<strong><?php esc_html_e( 'Missing from install:', 'nexuscontent' ); ?></strong>
						<?php foreach ( $missing as $type ) : ?>
							<span class="nc-admin-mode-badge nc-admin-mode-badge--muted"><?php echo esc_html( $labels[ $type ] ?? $type ); ?></span>
						<?php endforeach; ?>
					</li>
				<?php endif; ?>
				<?php if ( $unused ) : ?>
					<li>
						<strong><?php esc_html_e( 'Not used by the project:', 'nexuscontent' ); ?></strong>
						<?php foreach ( $unused as $type ) : ?>
							<span class="nc-admin-mode-badge"><?php echo esc_html( $labels[ $type ] ?? $type ); ?></span>
						<?php endforeach; ?>
					</li>
				<?php endif; ?>
				<?php if ( $disabled ) : ?>
					<li>
						<strong><?php esc_html_e( 'Disabled in settings:', 'nexuscontent' ); ?></strong>
						<?php foreach ( $disabled as $type ) : ?>
							<span class="nc-admin-mode-badge nc-admin-mode-badge--muted"><?php echo esc_html( $labels[ $type ] ?? $type ); ?></span>
						<?php endforeach; ?>
					</li>
				<?php endif; ?>
			</ul>
		<?php endif; ?>
		<?php
	}

	/**
	 * Recent pages and posts card.
	 *
	 * @param array<int, array<string, string>> $pages
	 */
	private function dashboard_card_recent( array $pages ): void {
		?>
		<div class="nc-admin-card">
			<div class="nc-admin-card-header">
				<span class="dashicons dashicons-clock"></span>
				<h2 class="nc-admin-card-title"><?php esc_html_e( 'Recent content', 'nexuscontent' ); ?></h2>
			</div>
			<div class="nc-admin-card-body">
				<?php if ( ! empty( $pages ) ) : ?>
					<table class="nc-admin-recent-table">
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
									<td>
										<span class="nc-admin-mode-badge nc-admin-mode-badge--<?php echo esc_attr( $page['mode'] ); ?>">
											<?php echo esc_html( $this->mode_label( $page['mode'] ) ); ?>
										</span>
									</td>
									<td class="nc-admin-recent-date"><?php echo esc_html( $page['date'] ); ?></td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				<?php else : ?>
					<div class="nc-admin-empty-state">
						<p><?php esc_html_e( 'No pages found.', 'nexuscontent' ); ?></p>
					</div>
				<?php endif; ?>
			</div>
		</div>
		<?php
	}

	/** Quick links card. */
	private function dashboard_card_links(): void {
		?>
		<div class="nc-admin-card">
			<div class="nc-admin-card-header">
				<span class="dashicons dashicons-admin-links"></span>
				<h2 class="nc-admin-card-title"><?php esc_html_e( 'Quick links', 'nexuscontent' ); ?></h2>
			</div>
			<div class="nc-admin-card-body">
				<div class="nc-admin-links-grid">
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::SETTINGS_SLUG ) ); ?>" class="nc-admin-link-card">
						<span class="dashicons dashicons-admin-settings"></span>
						<span class="nc-admin-link-label"><?php esc_html_e( 'Settings', 'nexuscontent' ); ?></span>
					</a>
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::ABOUT_SLUG ) ); ?>" class="nc-admin-link-card">
						<span class="dashicons dashicons-info-outline"></span>
						<span class="nc-admin-link-label"><?php esc_html_e( 'About', 'nexuscontent' ); ?></span>
					</a>
					<a href="<?php echo esc_url( self::repo_url() ); ?>" target="_blank" rel="noopener noreferrer" class="nc-admin-link-card">
						<span class="dashicons dashicons-external"></span>
						<span class="nc-admin-link-label"><?php esc_html_e( 'Documentation', 'nexuscontent' ); ?></span>
					</a>
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
		<div class="nc-admin-header">
			<div class="nc-admin-header-icon">
				<span class="dashicons dashicons-layout"></span>
			</div>
			<div class="nc-admin-header-text">
				<h1 class="nc-admin-header-title">
					NexusContent
					<span class="nc-admin-header-version"><?php echo esc_html( NEXUSCONTENT_COMPANION_VERSION ); ?></span>
				</h1>
				<p class="nc-admin-header-subtitle"><?php esc_html_e( 'Configure the block inserter and content defaults.', 'nexuscontent' ); ?></p>
			</div>
		</div>
		<form method="post" action="options.php" class="nc-admin-settings-form">
			<?php settings_fields( self::OPTION_GROUP ); ?>
			<div class="nc-admin-cards">
				<div class="nc-admin-card nc-admin-settings-card">
					<div class="nc-admin-card-header">
						<span class="dashicons dashicons-admin-settings"></span>
						<h2 class="nc-admin-card-title"><?php esc_html_e( 'Settings', 'nexuscontent' ); ?></h2>
					</div>
					<div class="nc-admin-card-body">
						<table class="form-table nc-admin-settings-table" role="presentation">
							<?php do_settings_fields( self::SETTINGS_SLUG, 'nexuscontent_config' ); ?>
						</table>
						<div class="nc-admin-submit">
							<?php submit_button( __( 'Save settings', 'nexuscontent' ) ); ?>
						</div>
					</div>
				</div>
			</div>
		</form>
		<?php
	}

	/* ----------------------------------------------------------------
	 * About page
	 * --------------------------------------------------------------- */

	public function render_about_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$capabilities = $this->capabilities->get();
		?>
		<div class="nc-admin-header">
			<div class="nc-admin-header-icon">
				<span class="dashicons dashicons-layout"></span>
			</div>
			<div class="nc-admin-header-text">
				<h1 class="nc-admin-header-title">
					NexusContent
					<span class="nc-admin-header-version"><?php echo esc_html( NEXUSCONTENT_COMPANION_VERSION ); ?></span>
				</h1>
				<p class="nc-admin-header-subtitle"><?php esc_html_e( 'Content integration companion for WordPress.', 'nexuscontent' ); ?></p>
			</div>
		</div>

		<div class="nc-admin-cards">
			<div class="nc-admin-card">
				<div class="nc-admin-card-header">
					<span class="dashicons dashicons-info-outline"></span>
					<h2 class="nc-admin-card-title"><?php esc_html_e( 'About NexusContent', 'nexuscontent' ); ?></h2>
				</div>
				<div class="nc-admin-card-body">
					<div class="nc-admin-about-section">
						<p><?php esc_html_e( 'NexusContent is an open-source content abstraction layer that provides a consistent interface between frontend applications and external content sources. This companion plugin normalizes WordPress content for consumption by NexusCore.', 'nexuscontent' ); ?></p>
					</div>
					<div class="nc-admin-about-section">
						<h3><?php esc_html_e( 'Requirements', 'nexuscontent' ); ?></h3>
						<ul>
							<li><?php esc_html_e( 'WordPress 6.6 or newer', 'nexuscontent' ); ?></li>
							<li><?php esc_html_e( 'PHP 8.1 or newer', 'nexuscontent' ); ?></li>
							<li>
								<?php esc_html_e( 'Advanced Custom Fields (ACF) 6.2+ for fixed and flexible editor modes', 'nexuscontent' ); ?>
								<?php esc_html_e( ' — optional.', 'nexuscontent' ); ?>
							</li>
						</ul>
					</div>
				</div>
			</div>

			<div class="nc-admin-card">
				<div class="nc-admin-card-header">
					<span class="dashicons dashiconswelcome-view-site"></span>
					<h2 class="nc-admin-card-title"><?php esc_html_e( 'Getting started', 'nexuscontent' ); ?></h2>
				</div>
				<div class="nc-admin-card-body">
					<ol class="nc-admin-about-steps">
						<li>
							<strong><?php esc_html_e( 'Activate the plugin', 'nexuscontent' ); ?></strong>
							<p><?php esc_html_e( 'After installing, activate NexusContent Companion from the Plugins screen.', 'nexuscontent' ); ?></p>
						</li>
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
						<li>
							<strong><?php esc_html_e( 'Create or edit a page', 'nexuscontent' ); ?></strong>
							<p><?php esc_html_e( 'Open any page in the block editor. The NexusContent panel in the sidebar lets you choose an editor mode.', 'nexuscontent' ); ?></p>
						</li>
						<li>
							<strong><?php esc_html_e( 'Add section blocks', 'nexuscontent' ); ?></strong>
							<p><?php esc_html_e( 'Use the block inserter to add NexusContent sections like Hero, Introduction, Features, and more. Each section has a preview and user-friendly fields.', 'nexuscontent' ); ?></p>
						</li>
						<li>
							<strong><?php esc_html_e( 'Connect your frontend', 'nexuscontent' ); ?></strong>
							<p><?php esc_html_e( 'Point your NexusContent configuration to this WordPress instance. The plugin exposes normalized content through secured REST routes.', 'nexuscontent' ); ?></p>
						</li>
					</ol>
				</div>
			</div>

			<div class="nc-admin-card">
				<div class="nc-admin-card-header">
					<span class="dashicons dashicons-book-alt"></span>
					<h2 class="nc-admin-card-title"><?php esc_html_e( 'Documentation and links', 'nexuscontent' ); ?></h2>
				</div>
				<div class="nc-admin-card-body">
					<div class="nc-admin-links-grid">
						<a href="<?php echo esc_url( self::repo_url() ); ?>" target="_blank" rel="noopener noreferrer" class="nc-admin-link-card">
							<span class="dashicons dashicons-external"></span>
							<span class="nc-admin-link-label"><?php esc_html_e( 'GitHub repository', 'nexuscontent' ); ?></span>
						</a>
						<a href="<?php echo esc_url( self::repo_url( '#readme' ) ); ?>" target="_blank" rel="noopener noreferrer" class="nc-admin-link-card">
							<span class="dashicons dashicons-media-document"></span>
							<span class="nc-admin-link-label"><?php esc_html_e( 'Documentation', 'nexuscontent' ); ?></span>
						</a>
						<a href="<?php echo esc_url( self::repo_url( '/blob/main/CHANGELOG.md' ) ); ?>" target="_blank" rel="noopener noreferrer" class="nc-admin-link-card">
							<span class="dashicons dashicons-update"></span>
							<span class="nc-admin-link-label"><?php esc_html_e( 'Changelog', 'nexuscontent' ); ?></span>
						</a>
						<a href="<?php echo esc_url( self::repo_url( '/issues' ) ); ?>" target="_blank" rel="noopener noreferrer" class="nc-admin-link-card">
							<span class="dashicons dashicons-sos"></span>
							<span class="nc-admin-link-label"><?php esc_html_e( 'Report an issue', 'nexuscontent' ); ?></span>
						</a>
					</div>
				</div>
			</div>

			<div class="nc-admin-card">
				<div class="nc-admin-card-header">
					<span class="dashicons dashicons-star-filled"></span>
					<h2 class="nc-admin-card-title"><?php esc_html_e( 'Features', 'nexuscontent' ); ?></h2>
				</div>
				<div class="nc-admin-card-body">
					<div class="nc-admin-about-features">
						<div class="nc-admin-about-feature">
							<span class="dashicons dashicons-block-default"></span>
							<h4><?php esc_html_e( '12 Section Blocks', 'nexuscontent' ); ?></h4>
							<p><?php esc_html_e( 'Hero, Introduction, Rich Text, Image and Text, Features, Statistics, Testimonials, Gallery, Call to Action, FAQ, Logo Grid, and Form Embed.', 'nexuscontent' ); ?></p>
						</div>
						<div class="nc-admin-about-feature">
							<span class="dashicons dashicons-format-image"></span>
							<h4><?php esc_html_e( 'Block Previews', 'nexuscontent' ); ?></h4>
							<p><?php esc_html_e( 'Each block shows a visual preview in the inserter and editor sidebar so non-technical users know what they are adding.', 'nexuscontent' ); ?></p>
						</div>
						<div class="nc-admin-about-feature">
							<span class="dashicons dashicons-edit"></span>
							<h4><?php esc_html_e( 'User-friendly fields', 'nexuscontent' ); ?></h4>
							<p><?php esc_html_e( 'Rich text, image pickers, repeatable items, and structured controls replace raw JSON or shortcode editing.', 'nexuscontent' ); ?></p>
						</div>
						<div class="nc-admin-about-feature">
							<span class="dashicons dashicons-database"></span>
							<h4><?php esc_html_e( 'Normalized output', 'nexuscontent' ); ?></h4>
							<p><?php esc_html_e( 'Content is normalized into a consistent structure that NexusContent Core can consume from any frontend.', 'nexuscontent' ); ?></p>
						</div>
					</div>
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

		// Preserve the REST-pushed project contract across a settings form save.
		$project = $this->capabilities->project_contract();

		$result = array(
			'default_editor_mode'  => $mode,
			'enabled_sections'     => $enabled,
			'media_resolution'     => $resolution,
			'preview_frontend_url' => $preview_url,
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
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function default_settings(): array {
		return array(
			'default_editor_mode'  => Editor_Mode::GUTENBERG,
			'enabled_sections'     => array_keys( $this->registry->definitions() ),
			'media_resolution'     => 'large',
			'preview_frontend_url' => '',
		);
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
