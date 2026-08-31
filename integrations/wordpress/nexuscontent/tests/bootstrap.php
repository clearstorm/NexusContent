<?php
/**
 * Bootstrap for pure PHPUnit tests. WordPress owns these symbols when present.
 */

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/wordpress-stub/' );
}
if ( ! defined( 'NEXUSCONTENT_COMPANION_VERSION' ) ) {
	define( 'NEXUSCONTENT_COMPANION_VERSION', '0.1.1-test' );
}
if ( ! defined( 'NEXUSCONTENT_COMPANION_CONTRACT_VERSION' ) ) {
	define( 'NEXUSCONTENT_COMPANION_CONTRACT_VERSION', 1 );
}
if ( ! defined( 'NEXUSCONTENT_COMPANION_REST_NAMESPACE' ) ) {
	define( 'NEXUSCONTENT_COMPANION_REST_NAMESPACE', 'nexuscontent/v1' );
}
if ( ! defined( 'NEXUSCONTENT_COMPANION_FILE' ) ) {
	define( 'NEXUSCONTENT_COMPANION_FILE', dirname( __DIR__ ) . '/nexuscontent.php' );
}
if ( ! defined( 'NEXUSCONTENT_COMPANION_DIR' ) ) {
	define( 'NEXUSCONTENT_COMPANION_DIR', dirname( __DIR__ ) . '/' );
}
if ( ! defined( 'OBJECT' ) ) {
	define( 'OBJECT', 'OBJECT' );
}

$GLOBALS['nc_test'] = array();

if ( ! class_exists( 'WP_Post' ) ) {
	class WP_Post {
		public int $ID = 0;
		public string $post_type = 'page';
		public string $post_status = 'publish';
		public string $post_name = '';
		public string $post_title = '';
		public string $post_content = '';
		public string $post_excerpt = '';
		public string $post_modified_gmt = '2026-01-02 03:04:05';
		public string $post_modified = '2026-01-02 03:04:05';
		public string $post_password = '';
		public int $post_parent = 0;

		/** @param array<string, mixed>|object $post */
		public function __construct( $post = array() ) {
			foreach ( (array) $post as $key => $value ) {
				if ( property_exists( $this, (string) $key ) ) {
					$this->{$key} = $value;
				}
			}
		}
	}
}
if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		public function __construct( public string $code = '', public string $message = '', public array $data = array() ) {}
		public function get_error_code(): string { return $this->code; }
		public function get_error_data(): array { return $this->data; }
	}
}
if ( ! class_exists( 'WP_REST_Controller' ) ) {
	class WP_REST_Controller { protected string $namespace = ''; protected string $rest_base = ''; }
}
if ( ! class_exists( 'WP_REST_Request' ) ) {
	class WP_REST_Request implements ArrayAccess {
		private array $params = array();
		private array $headers = array();
		private string $route = '';
		public function __construct( string $method = 'GET', string $route = '' ) { $this->route = $route; }
		public function get_route(): string { return $this->route; }
		public function set_param( string $key, $value ): void { $this->params[ $key ] = $value; }
		public function get_param( string $key ) { return $this->params[ $key ] ?? null; }
		public function set_header( string $key, $value ): void { $this->headers[ $key ] = $value; }
		public function get_header( string $key ) { return $this->headers[ $key ] ?? ''; }
		public function get_headers(): array { return $this->headers; }
		public function offsetExists( $offset ): bool { return isset( $this->params[ $offset ] ); }
		public function offsetGet( $offset ) { return $this->params[ $offset ] ?? null; }
		public function offsetSet( $offset, $value ): void { $this->params[ $offset ] = $value; }
		public function offsetUnset( $offset ): void { unset( $this->params[ $offset ] ); }
	}
}
if ( ! class_exists( 'WP_REST_Response' ) ) {
	class WP_REST_Response {
		private array $headers = array();
		public function __construct( private $data = null, private int $status = 200 ) {}
		public function get_data() { return $this->data; }
		public function get_status(): int { return $this->status; }
		public function header( string $key, string $value ): void { $this->headers[ $key ] = $value; }
		public function get_headers(): array { return $this->headers; }
	}
}
if ( ! class_exists( 'WP_Query' ) ) {
	class WP_Query {
		public array $posts = array();
		public int $found_posts = 0;
		public int $max_num_pages = 0;
		public function __construct( array $args = array() ) {
			$GLOBALS['nc_test']['query_args'][] = $args;
			$raw = $GLOBALS['nc_test']['query_posts'] ?? array();
			$fields = $args['fields'] ?? '';
			if ( 'ids' === $fields ) {
				$this->posts = array_map( 'intval', $raw );
			} else {
				$this->posts = array_map( function ( $id ) {
					if ( $id instanceof \WP_Post ) {
						return $id;
					}
					$post = new \WP_Post( array( 'ID' => (int) $id ) );
					$post->post_title = 'Page ' . $id;
					return $post;
				}, $raw );
			}
			$this->found_posts = count( $this->posts );
			$per_page = max( 1, (int) ( $args['posts_per_page'] ?? 10 ) );
			$this->max_num_pages = (int) ceil( $this->found_posts / $per_page );
		}
	}
}

if ( ! function_exists( 'nc_test_reset' ) ) {
	function nc_test_reset(): void {
		$GLOBALS['nc_test'] = array(
			'' => array(), 'actions' => array(), 'filters' => array(), 'meta' => array(), 'fields' => array(),
			'posts' => array(), 'blocks' => array(), 'caps' => array(), 'attachment_calls' => array(),
			'styles' => array(), 'options' => array(), 'menus' => array(), 'query_posts' => array(),
			'query_args' => array(), 'registered_meta' => array(), 'transients' => array(),
		);
		$GLOBALS['wp_version'] = '6.6-test';
	}
}
nc_test_reset();

if ( ! function_exists( 'add_action' ) ) { function add_action( $hook, $callback, $priority = 10, $args = 1 ) { $GLOBALS['nc_test']['actions'][ $hook ][] = $callback; return true; } }
if ( ! function_exists( 'add_filter' ) ) { function add_filter( $hook, $callback, $priority = 10, $args = 1 ) { $GLOBALS['nc_test']['filters'][ $hook ][] = $callback; return true; } }
if ( ! function_exists( 'apply_filters' ) ) { function apply_filters( $hook, $value, ...$args ) { foreach ( $GLOBALS['nc_test']['filters'][ $hook ] ?? array() as $callback ) { $value = $callback( $value, ...$args ); } return $value; } }
if ( ! function_exists( 'do_action' ) ) { function do_action( $hook, ...$args ) { foreach ( $GLOBALS['nc_test']['actions'][ $hook ] ?? array() as $callback ) { $callback( ...$args ); } } }
if ( ! function_exists( '__' ) ) { function __( $value, $domain = null ) { return $value; } }
if ( ! function_exists( 'esc_html__' ) ) { function esc_html__( $value, $domain = null ) { return htmlspecialchars( $value, ENT_QUOTES ); } }
if ( ! function_exists( 'esc_html_e' ) ) { function esc_html_e( $value, $domain = null ) { echo esc_html__( $value, $domain ); } }
if ( ! function_exists( 'esc_html' ) ) { function esc_html( $value ) { return htmlspecialchars( (string) $value, ENT_QUOTES ); } }
if ( ! function_exists( 'esc_attr' ) ) { function esc_attr( $value ) { return htmlspecialchars( (string) $value, ENT_QUOTES ); } }
if ( ! function_exists( 'sanitize_key' ) ) { function sanitize_key( $value ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $value ) ); } }
if ( ! function_exists( 'sanitize_title' ) ) { function sanitize_title( $value ) { return trim( preg_replace( '/[^a-z0-9]+/', '-', strtolower( (string) $value ) ), '-' ); } }
if ( ! function_exists( 'sanitize_text_field' ) ) { function sanitize_text_field( $value ) { return trim( strip_tags( (string) $value ) ); } }
if ( ! function_exists( 'absint' ) ) { function absint( $value ) { return abs( (int) $value ); } }
if ( ! function_exists( 'esc_url_raw' ) ) { function esc_url_raw( $value ) { return filter_var( (string) $value, FILTER_VALIDATE_URL ) ? (string) $value : ''; } }
if ( ! function_exists( 'trailingslashit' ) ) { function trailingslashit( $value ) { return rtrim( (string) $value, '/' ) . '/'; } }
if ( ! function_exists( 'wp_kses_post' ) ) { function wp_kses_post( $value ) { return (string) $value; } }
if ( ! function_exists( 'wp_kses' ) ) { function wp_kses( $value, $allowed ) { $tags = '<' . implode( '><', array_keys( $allowed ) ) . '>'; $clean = strip_tags( (string) $value, $tags ); $clean = preg_replace( '/\son[a-z]+=("[^"]*"|\'[^\']*\')/i', '', $clean ); return preg_replace( '/\s(href|src)=("|\')javascript:[^"\']*("|\')/i', ' $1=$2$2', (string) $clean ); } }
if ( ! function_exists( 'wp_strip_all_tags' ) ) { function wp_strip_all_tags( $value ) { return strip_tags( (string) $value ); } }
if ( ! function_exists( 'wp_register_style' ) ) { function wp_register_style( $handle, $src = '', $deps = array(), $ver = false, $media = 'all' ) {} }
if ( ! function_exists( 'wp_enqueue_style' ) ) { function wp_enqueue_style( $handle, $src = '', $deps = array(), $ver = false, $media = 'all' ) { $GLOBALS['nc_test']['styles'][] = $handle; } }
if ( ! function_exists( 'plugins_url' ) ) { function plugins_url( $path = '', $plugin = '' ) { return 'https://example.com/wp-content/plugins/nexuscontent/' . ltrim( $path, '/' ); } }
if ( ! function_exists( 'plugin_dir_path' ) ) { function plugin_dir_path( $file ) { return dirname( $file ) . '/'; } }
if ( ! function_exists( 'plugin_basename' ) ) { function plugin_basename( $file ) { return 'nexuscontent/nexuscontent.php'; } }
if ( ! function_exists( 'wp_check_invalid_utf8' ) ) { function wp_check_invalid_utf8( $value ) { return (string) $value; } }
if ( ! function_exists( 'wp_extract_urls' ) ) { function wp_extract_urls( $value ) { preg_match_all( '~https?://[^\s"\']+~', (string) $value, $matches ); return $matches[0]; } }
if ( ! function_exists( 'post_type_supports' ) ) { function post_type_supports( $type, $feature ) { return $GLOBALS['nc_test']['block_editor'] ?? true; } }
if ( ! function_exists( 'use_block_editor_for_post_type' ) ) { function use_block_editor_for_post_type( $type ) { return $GLOBALS['nc_test']['block_editor'] ?? true; } }
if ( ! function_exists( 'current_user_can' ) ) { function current_user_can( $capability, ...$args ) { return (bool) ( $GLOBALS['nc_test']['caps'][ $capability ] ?? false ); } }
if ( ! function_exists( 'get_post_meta' ) ) { function get_post_meta( $id, $key, $single = false ) { return $GLOBALS['nc_test']['meta'][ $id ][ $key ] ?? ''; } }
if ( ! function_exists( 'update_post_meta' ) ) { function update_post_meta( $id, $key, $value ) { $GLOBALS['nc_test']['meta'][ $id ][ $key ] = $value; return true; } }
if ( ! function_exists( 'metadata_exists' ) ) { function metadata_exists( $type, $id, $key ) { return array_key_exists( $key, $GLOBALS['nc_test']['meta'][ $id ] ?? array() ); } }
if ( ! function_exists( 'get_field' ) ) { function get_field( $key, $id = false, $format = true ) { return $GLOBALS['nc_test']['fields'][ $id ][ $key ] ?? null; } }
if ( ! function_exists( 'acf_get_field_type' ) ) { function acf_get_field_type( $type ) { return (bool) ( $GLOBALS['nc_test']['acf_field_types'][ $type ] ?? false ); } }
if ( ! function_exists( 'get_post' ) ) { function get_post( $id ) { return $GLOBALS['nc_test']['posts'][ (int) $id ] ?? null; } }
if ( ! function_exists( 'get_page_by_path' ) ) { function get_page_by_path( $slug, $output = OBJECT, $type = 'page' ) { foreach ( $GLOBALS['nc_test']['posts'] as $post ) { if ( $post->post_name === $slug && $post->post_type === $type ) return $post; } return null; } }
if ( ! function_exists( 'get_the_title' ) ) { function get_the_title( $post ) { return $post->post_title; } }
if ( ! function_exists( 'get_post_thumbnail_id' ) ) { function get_post_thumbnail_id( $post ) { return $GLOBALS['nc_test']['thumbnail'][ is_object( $post ) ? $post->ID : $post ] ?? 0; } }
if ( ! function_exists( 'get_post_field' ) ) { function get_post_field( $field, $id ) { $post = get_post( $id ); return $post ? $post->{$field} : ''; } }
if ( ! function_exists( 'parse_blocks' ) ) { function parse_blocks( $content ) { return $GLOBALS['nc_test']['blocks']; } }
if ( ! function_exists( 'mysql2date' ) ) { function mysql2date( $format, $date, $translate = true ) { return gmdate( $format, strtotime( $date . ' UTC' ) ); } }
if ( ! function_exists( 'get_post_modified_time' ) ) { function get_post_modified_time( $format, $gmt, $post ) { return gmdate( $format, strtotime( $post->post_modified_gmt . ' UTC' ) ); } }
if ( ! function_exists( 'wp_get_attachment_url' ) ) { function wp_get_attachment_url( $id ) { $GLOBALS['nc_test']['attachment_calls'][ $id ] = 1 + ( $GLOBALS['nc_test']['attachment_calls'][ $id ] ?? 0 ); return $GLOBALS['nc_test']['attachment_urls'][ $id ] ?? false; } }
if ( ! function_exists( 'wp_get_attachment_metadata' ) ) { function wp_get_attachment_metadata( $id ) { return $GLOBALS['nc_test']['attachment_meta'][ $id ] ?? false; } }
if ( ! function_exists( 'wp_get_attachment_image_src' ) ) { function wp_get_attachment_image_src( $id, $size ) { return $GLOBALS['nc_test']['attachment_sizes'][ $id ][ $size ] ?? false; } }
if ( ! function_exists( 'get_post_mime_type' ) ) { function get_post_mime_type( $id ) { return $GLOBALS['nc_test']['mime'][ $id ] ?? ''; } }
if ( ! function_exists( 'rest_authorization_required_code' ) ) { function rest_authorization_required_code() { return 401; } }
if ( ! function_exists( 'register_post_meta' ) ) { function register_post_meta( $type, $key, $args ) { $GLOBALS['nc_test']['registered_meta'][ $type ][ $key ] = $args; return true; } }
if ( ! function_exists( 'register_rest_route' ) ) { function register_rest_route( $namespace, $route, $args ) { $GLOBALS['nc_test']['routes'][ $namespace . $route ] = $args; return true; } }
if ( ! function_exists( 'get_option' ) ) { function get_option( $option, $default = false ) { return $GLOBALS['nc_test']['options'][ $option ] ?? $default; } }
if ( ! function_exists( 'update_option' ) ) { function update_option( $option, $value, $autoload = null ) { $GLOBALS['nc_test']['options'][ $option ] = $value; return true; } }
if ( ! function_exists( 'wp_verify_nonce' ) ) { function wp_verify_nonce( $nonce, $action = -1 ) { return ( $GLOBALS['nc_test']['nonces'][ $action ] ?? null ) === $nonce ? 1 : false; } }
if ( ! function_exists( 'rest_ensure_response' ) ) { function rest_ensure_response( $response ) { return $response instanceof WP_REST_Response ? $response : new WP_REST_Response( $response ); } }
if ( ! function_exists( 'add_menu_page' ) ) { function add_menu_page( $page_title, $menu_title, $capability, $menu_slug, $function = '', $icon_url = '', $position = null ) { $GLOBALS['nc_test']['menus'][ $menu_slug ] = compact( 'page_title', 'menu_title', 'capability', 'function' ); return $menu_slug; } }
if ( ! function_exists( 'add_submenu_page' ) ) { function add_submenu_page( $parent_slug, $page_title, $menu_title, $capability, $menu_slug, $function = '' ) { $GLOBALS['nc_test']['menus'][ $menu_slug ] = compact( 'page_title', 'menu_title', 'capability', 'function', 'parent_slug' ); return $menu_slug; } }
if ( ! function_exists( 'register_setting' ) ) { function register_setting( $option_group, $option_name, $args = array() ) { $GLOBALS['nc_test']['settings'][ $option_name ] = $args; return true; } }
if ( ! function_exists( 'add_settings_section' ) ) { function add_settings_section( $id, $title, $callback, $page ) { $GLOBALS['nc_test']['settings_sections'][ $id ] = compact( 'title', 'callback', 'page' ); } }
if ( ! function_exists( 'add_settings_field' ) ) { function add_settings_field( $id, $title, $callback, $page, $section = '', $args = array() ) { $GLOBALS['nc_test']['settings_fields'][ $id ] = compact( 'title', 'callback', 'page', 'section' ); } }
if ( ! function_exists( 'settings_fields' ) ) { function settings_fields( $option_group ) {} }
if ( ! function_exists( 'do_settings_sections' ) ) { function do_settings_sections( $page ) {} }
if ( ! function_exists( 'do_settings_fields' ) ) { function do_settings_fields( $page, $section ) { foreach ( $GLOBALS['nc_test']['settings_fields'] ?? array() as $field ) { if ( isset( $field['callback'] ) && is_callable( $field['callback'] ) ) { echo '<tr><th scope="row">' . esc_html( $field['title'] ?? '' ) . '</th><td>'; call_user_func( $field['callback'] ); echo '</td></tr>'; } } } }
if ( ! function_exists( 'submit_button' ) ) { function submit_button( $text = '' ) { echo '<input type="submit" class="button button-primary" value="' . esc_attr( $text ) . '" />'; } }
if ( ! function_exists( 'selected' ) ) { function selected( $selected, $current = '', $echo = true ) { return $selected === $current ? 'selected="selected"' : ''; } }
if ( ! function_exists( 'checked' ) ) { function checked( $checked, $current = '', $echo = true ) { return $checked === $current ? 'checked="checked"' : ''; } }
if ( ! function_exists( 'disabled' ) ) { function disabled( $disabled, $current = '', $echo = true ) { return $disabled === $current ? 'disabled="disabled"' : ''; } }
if ( ! function_exists( 'get_the_date' ) ) { function get_the_date( $format = '', $post = null ) { $post = is_object( $post ) ? $post : null; return $format ? gmdate( $format ) : gmdate( 'M j, Y' ); } }
if ( ! function_exists( 'get_edit_post_link' ) ) { function get_edit_post_link( $id = 0, $context = 'display' ) { return 'https://example.com/wp-admin/post.php?post=' . (int) $id . '&action=edit'; } }
if ( ! function_exists( 'admin_url' ) ) { function admin_url( $path = '' ) { return 'https://example.com/wp-admin/' . ltrim( $path, '/' ); } }
if ( ! function_exists( 'esc_url' ) ) { function esc_url( $url ) { return (string) $url; } }
if ( ! function_exists( 'has_blocks' ) ) { function has_blocks( $content ) { return false; } }
if ( ! function_exists( 'get_current_user_id' ) ) { function get_current_user_id() { return (int) ( $GLOBALS['nc_test']['current_user'] ?? 0 ); } }
if ( ! function_exists( 'set_transient' ) ) { function set_transient( $key, $value, $expiration = 0 ) { $GLOBALS['nc_test']['transients'][ $key ] = array( 'value' => $value, 'expires' => time() + (int) $expiration ); return true; } }
if ( ! function_exists( 'get_transient' ) ) { function get_transient( $key ) { $entry = $GLOBALS['nc_test']['transients'][ $key ] ?? null; if ( null === $entry ) { return false; } if ( $entry['expires'] < time() ) { unset( $GLOBALS['nc_test']['transients'][ $key ] ); return false; } return $entry['value']; } }
if ( ! function_exists( 'delete_transient' ) ) { function delete_transient( $key ) { unset( $GLOBALS['nc_test']['transients'][ $key ] ); return true; } }
if ( ! function_exists( 'wp_http_validate_url' ) ) { function wp_http_validate_url( $url ) { $parsed = wp_parse_url( $url ); return isset( $parsed['scheme'], $parsed['host'] ) && in_array( strtolower( $parsed['scheme'] ), array( 'http', 'https' ), true ) ? (string) $url : false; } }
if ( ! function_exists( 'wp_parse_url' ) ) { function wp_parse_url( $url ) { return parse_url( (string) $url ); } }

$root = dirname( __DIR__ );
foreach ( array(
	'includes/class-contract.php', 'includes/class-diagnostics.php', 'includes/class-capabilities.php',
	'includes/class-editor-mode.php', 'includes/class-section-registry.php', 'includes/class-media-normalizer.php',
	'includes/class-normalizer.php', 'includes/class-preview-token.php', 'includes/class-rest-controller.php', 'includes/class-admin-page.php',
	'includes/blocks/class-block-normalizer.php', 'includes/blocks/class-block-loader.php',
	'includes/acf/class-acf-field-factory.php', 'includes/acf/class-acf-loader.php',
) as $file ) {
	require_once $root . '/' . $file;
}
