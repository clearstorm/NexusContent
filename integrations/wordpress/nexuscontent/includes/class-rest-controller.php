<?php
/**
 * NexusContent Companion REST endpoints.
 *
 * @package NexusContentCompanion
 */

namespace NexusContent\Companion;

use WP_Error;
use WP_Post;
use WP_Query;
use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class REST_Controller extends WP_REST_Controller {
	private Contract $contract;
	private Normalizer $normalizer;
	private Section_Registry $registry;
	private Capabilities $capabilities;

	public function __construct( Contract $contract, Normalizer $normalizer, Section_Registry $registry, Capabilities $capabilities ) {
		$this->namespace    = NEXUSCONTENT_COMPANION_REST_NAMESPACE;
		$this->rest_base    = 'pages';
		$this->contract     = $contract;
		$this->normalizer   = $normalizer;
		$this->registry     = $registry;
		$this->capabilities = $capabilities;
	}

	public function register_routes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_pages' ),
				'permission_callback' => array( $this, 'pages_permissions_check' ),
				'args'                => $this->collection_args(),
			)
		);
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_page' ),
				'permission_callback' => array( $this, 'page_permissions_check' ),
				'args'                => array(
					'id' => array(
						'type'              => 'integer',
						'required'          => true,
						'sanitize_callback' => 'absint',
						'validate_callback' => static fn( $value ): bool => is_numeric( $value ) && (int) $value > 0,
					),
				),
			)
		);
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/slug/(?P<slug>[^/]+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_page_by_slug' ),
				'permission_callback' => array( $this, 'slug_permissions_check' ),
				'args'                => array(
					'slug' => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_title',
					),
				),
			)
		);
		register_rest_route(
			$this->namespace,
			'/schema',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_schema' ),
				'permission_callback' => array( $this, 'public_permissions_check' ),
			)
		);
		register_rest_route(
			$this->namespace,
			'/capabilities',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_capabilities' ),
				'permission_callback' => array( $this, 'public_permissions_check' ),
			)
		);
	}

	public function public_permissions_check(): bool {
		return true;
	}

	/** @return true|WP_Error */
	public function pages_permissions_check( WP_REST_Request $request ) {
		$status = $request->get_param( 'status' );
		if ( null === $status || '' === $status || 'publish' === $status ) {
			return true;
		}

		if ( 'private' === $status ) {
			return current_user_can( 'read_private_pages' ) ? true : $this->forbidden();
		}

		return current_user_can( 'edit_pages' ) ? true : $this->forbidden();
	}

	/** @return true|WP_Error */
	public function page_permissions_check( WP_REST_Request $request ) {
		return $this->can_read_page( get_post( absint( $request['id'] ) ) );
	}

	/** @return true|WP_Error */
	public function slug_permissions_check( WP_REST_Request $request ) {
		$post = get_page_by_path( sanitize_title( (string) $request['slug'] ), OBJECT, 'page' );
		return $this->can_read_page( $post );
	}

	/** @return WP_REST_Response|WP_Error */
	public function get_pages( WP_REST_Request $request ) {
		$status = $request->get_param( 'status' );
		$status = is_string( $status ) && '' !== $status ? $status : 'publish';

		$orderby = (string) $request->get_param( 'orderby' );
		$orderby = match ( $orderby ) {
			'id'   => 'ID',
			'slug' => 'name',
			default => $orderby,
		};
		$args  = array(
			'post_type'           => 'page',
			'post_status'         => $status,
			'paged'               => max( 1, (int) $request->get_param( 'page' ) ),
			'posts_per_page'      => min( 100, max( 1, (int) $request->get_param( 'per_page' ) ) ),
			's'                   => (string) $request->get_param( 'search' ),
			'name'                => (string) $request->get_param( 'slug' ),
			'order'               => (string) $request->get_param( 'order' ),
			'orderby'             => $orderby,
			'has_password'        => false,
			'ignore_sticky_posts' => true,
			'no_found_rows'       => false,
		);
		$query = new WP_Query( $args );
		if ( $query->max_num_pages > 0 && $args['paged'] > $query->max_num_pages ) {
			return new WP_Error( 'rest_post_invalid_page_number', __( 'The page number requested is larger than the number of pages available.', 'nexuscontent' ), array( 'status' => 400 ) );
		}

		$items       = array();
		$diagnostics = new Diagnostics();
		foreach ( $query->posts as $post ) {
			if ( $post instanceof WP_Post && ( 'publish' !== $status || $this->is_page_visible( $post ) ) ) {
				$items[] = $this->normalizer->page( $post, $diagnostics );
			}
		}

		$data     = array(
			'items'      => $items,
			'pagination' => array(
				'total'      => (int) $query->found_posts,
				'totalPages' => (int) $query->max_num_pages,
				'page'       => $args['paged'],
				'perPage'    => $args['posts_per_page'],
			),
		);
		$response = $this->respond( $data, $diagnostics, 'pages' );
		if ( $response instanceof WP_REST_Response ) {
			$response->header( 'X-WP-Total', (string) $query->found_posts );
			$response->header( 'X-WP-TotalPages', (string) $query->max_num_pages );
		}

		return $response;
	}

	/** @return WP_REST_Response|WP_Error */
	public function get_page( WP_REST_Request $request ) {
		return $this->respond_with_post( get_post( absint( $request['id'] ) ) );
	}

	/** @return WP_REST_Response|WP_Error */
	public function get_page_by_slug( WP_REST_Request $request ) {
		$post = get_page_by_path( sanitize_title( (string) $request['slug'] ), OBJECT, 'page' );
		return $this->respond_with_post( $post );
	}

	/** @return WP_REST_Response|WP_Error */
	public function get_schema() {
		$diagnostics = new Diagnostics();
		$data        = array(
			'editorModes'        => $this->capabilities->editor_modes(),
			'sectionDefinitions' => $this->registry->rest_definitions(),
			'sourceMappings'     => $this->registry->source_mappings(),
		);

		/**
		 * Filters the public companion schema before contract validation.
		 *
		 * @param array<string, mixed> $data Schema data.
		 */
		$filtered = apply_filters( 'nexuscontent_schema', $data );
		return $this->respond( is_array( $filtered ) ? $filtered : $data, $diagnostics, 'schema' );
	}

	/** @return WP_REST_Response|WP_Error */
	public function get_capabilities() {
		return $this->respond( $this->capabilities->get(), new Diagnostics(), 'capabilities' );
	}

	/** @return WP_REST_Response|WP_Error */
	private function respond_with_post( $post ) {
		if ( ! $post instanceof WP_Post || 'page' !== $post->post_type ) {
			return $this->not_found();
		}
		$permission = $this->can_read_page( $post );
		if ( true !== $permission ) {
			return $permission;
		}

		$diagnostics = new Diagnostics();
		return $this->respond( $this->normalizer->page( $post, $diagnostics ), $diagnostics, 'page' );
	}

	/** @param array<string, mixed> $data @return WP_REST_Response|WP_Error */
	private function respond( array $data, Diagnostics $diagnostics, string $shape ) {
		$envelope = array(
			'contractVersion' => Contract::VERSION,
			'data'            => $data,
		);
		if ( $diagnostics->all() ) {
			$envelope['diagnostics'] = $diagnostics->all();
		}

		if ( ! $this->contract->validate( $envelope, $shape ) ) {
			if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				error_log( sprintf( 'NexusContent Companion rejected an invalid %s response.', sanitize_key( $shape ) ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			}
			return new WP_Error(
				Contract::ERROR_INVALID_RESPONSE,
				__( 'NexusContent could not produce a valid response.', 'nexuscontent' ),
				array( 'status' => 500 )
			);
		}

		return new WP_REST_Response( $envelope, 200 );
	}

	/** @return true|WP_Error */
	private function can_read_page( $post ) {
		if ( ! $post instanceof WP_Post || 'page' !== $post->post_type ) {
			return true;
		}
		if ( 'publish' === $post->post_status && '' === $post->post_password ) {
			return true;
		}

		return current_user_can( 'edit_post', $post->ID ) ? true : $this->forbidden();
	}

	private function is_page_visible( WP_Post $post ): bool {
		return 'publish' === $post->post_status && '' === $post->post_password || current_user_can( 'edit_post', $post->ID );
	}

	private function not_found(): WP_Error {
		return new WP_Error( Contract::ERROR_NOT_FOUND, __( 'Page not found.', 'nexuscontent' ), array( 'status' => 404 ) );
	}

	private function forbidden(): WP_Error {
		return new WP_Error( Contract::ERROR_FORBIDDEN, __( 'You are not allowed to access this page.', 'nexuscontent' ), array( 'status' => rest_authorization_required_code() ) );
	}

	/** @return array<string, array<string, mixed>> */
	private function collection_args(): array {
		return array(
			'page'     => array(
				'type'              => 'integer',
				'default'           => 1,
				'minimum'           => 1,
				'sanitize_callback' => 'absint',
			),
			'per_page' => array(
				'type'              => 'integer',
				'default'           => 10,
				'minimum'           => 1,
				'maximum'           => 100,
				'sanitize_callback' => 'absint',
			),
			'search'   => array(
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'slug'     => array(
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_title',
			),
			'status'   => array(
				'type'              => 'string',
				'default'           => 'publish',
				'enum'              => array( 'publish', 'future', 'draft', 'pending', 'private' ),
				'sanitize_callback' => 'sanitize_key',
			),
			'order'    => array(
				'type'              => 'string',
				'default'           => 'desc',
				'enum'              => array( 'asc', 'desc' ),
				'sanitize_callback' => static fn( $value ): string => strtolower( sanitize_key( (string) $value ) ),
			),
			'orderby'  => array(
				'type'              => 'string',
				'default'           => 'date',
				'enum'              => array( 'date', 'id', 'title', 'slug', 'modified', 'menu_order', 'relevance' ),
				'sanitize_callback' => 'sanitize_key',
			),
		);
	}
}
