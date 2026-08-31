<?php
/**
 * Companion wire contract validation.
 *
 * @package NexusContentCompanion
 */

namespace NexusContent\Companion;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Contract {
	public const VERSION                           = 1;
	public const ERROR_INVALID_RESPONSE            = 'wordpress/companion/invalid-response';
	public const ERROR_NOT_FOUND                   = 'wordpress/companion/not-found';
	public const ERROR_FORBIDDEN                   = 'wordpress/companion/forbidden';
	public const ERROR_INVALID_EDITOR_MODE         = 'wordpress/config/invalid-editor-mode';
	public const ERROR_UNSUPPORTED_EDITOR_MODE     = 'wordpress/editor/unsupported-mode';
	public const ERROR_MALFORMED_BLOCK_CONTENT     = 'wordpress/block/malformed-content';
	public const ERROR_UNKNOWN_BLOCK               = 'wordpress/block/unknown';
	public const ERROR_UNKNOWN_ACF_BLOCK           = 'wordpress/acf/unknown-block';
	public const ERROR_UNKNOWN_ACF_LAYOUT          = 'wordpress/acf/unknown-layout';
	public const ERROR_INVALID_FIXED_SECTION       = 'wordpress/section/invalid-fixed';
	public const ERROR_INVALID_SECTION             = 'wordpress/section/invalid';
	public const ERROR_MEDIA_UNAVAILABLE           = 'wordpress/media/resolution-failed';
	public const ERROR_CONFLICTING_SECTION_SOURCES = 'wordpress/section/conflicting-sources';
	public const ERROR_INVALID_PREVIEW_TOKEN       = 'wordpress/preview/invalid-token';

	/**
	 * Validates only the public envelope and endpoint-owned fields.
	 *
	 * @param array<string, mixed> $envelope Response envelope.
	 */
	public function validate( array $envelope, string $shape ): bool {
		if ( array_diff( array_keys( $envelope ), array( 'contractVersion', 'data', 'diagnostics' ) ) ) {
			return false;
		}
		if ( self::VERSION !== ( $envelope['contractVersion'] ?? null ) || ! isset( $envelope['data'] ) || ! is_array( $envelope['data'] ) ) {
			return false;
		}

		if ( isset( $envelope['diagnostics'] ) && ! $this->valid_diagnostics( $envelope['diagnostics'] ) ) {
			return false;
		}

		$data = $envelope['data'];
		if ( ! $this->is_json_value( $data ) ) {
			return false;
		}

		return match ( $shape ) {
			'page'           => $this->valid_page( $data ),
			'pages'          => isset( $data['items'], $data['pagination'] ) && is_array( $data['items'] ) && is_array( $data['pagination'] ) && $this->valid_pages( $data['items'] ) && $this->valid_pagination( $data['pagination'] ),
			'schema'         => $this->valid_schema( $data ),
			'capabilities'   => $this->valid_capabilities( $data ),
			'preview_token'  => $this->valid_preview_token( $data ),
			default          => false,
		};
	}

	/** @param mixed $value */
	private function valid_diagnostics( $value ): bool {
		if ( ! is_array( $value ) ) {
			return false;
		}

		foreach ( $value as $entry ) {
			if ( ! is_array( $entry ) || ! is_string( $entry['severity'] ?? null ) || ! is_string( $entry['code'] ?? null ) || ! is_string( $entry['message'] ?? null ) ) {
				return false;
			}
			if ( ! in_array( $entry['severity'], array( 'error', 'warning', 'info' ), true ) || ( isset( $entry['path'] ) && ! is_string( $entry['path'] ) ) ) {
				return false;
			}
		}

		return true;
	}

	/** @param array<string, mixed> $page */
	private function valid_page( array $page ): bool {
		if ( ! is_string( $page['id'] ?? null ) || ! is_string( $page['key'] ?? null ) || ! is_array( $page['sections'] ?? null ) || ! is_array( $page['rawFields'] ?? null ) ) {
			return false;
		}
		foreach ( array( 'slug', 'title', 'excerpt', 'modifiedAt' ) as $key ) {
			if ( isset( $page[ $key ] ) && ! is_string( $page[ $key ] ) ) {
				return false;
			}
		}
		if ( isset( $page['status'] ) && ! in_array( $page['status'], array( 'draft', 'published', 'archived' ), true ) ) {
			return false;
		}
		if ( isset( $page['featuredImage'] ) && ( ! is_array( $page['featuredImage'] ) || ! is_string( $page['featuredImage']['url'] ?? null ) ) ) {
			return false;
		}

		foreach ( $page['sections'] as $section ) {
			if ( ! is_array( $section ) || ! is_string( $section['id'] ?? null ) || ! is_string( $section['type'] ?? null ) || ! is_array( $section['data'] ?? null ) ) {
				return false;
			}
			if ( isset( $section['settings'] ) && ! is_array( $section['settings'] ) ) {
				return false;
			}
		}

		return true;
	}

	/** @param array<int, mixed> $pages */
	private function valid_pages( array $pages ): bool {
		foreach ( $pages as $page ) {
			if ( ! is_array( $page ) || ! $this->valid_page( $page ) ) {
				return false;
			}
		}

		return true;
	}

	/** @param array<string, mixed> $pagination */
	private function valid_pagination( array $pagination ): bool {
		foreach ( array( 'total', 'totalPages', 'page', 'perPage' ) as $key ) {
			if ( ! isset( $pagination[ $key ] ) || ! is_int( $pagination[ $key ] ) || $pagination[ $key ] < 0 ) {
				return false;
			}
		}
		if ( $pagination['page'] < 1 || $pagination['perPage'] < 1 ) {
			return false;
		}

		return true;
	}

	/** @param array<string, mixed> $schema */
	private function valid_schema( array $schema ): bool {
		if ( ! is_array( $schema['editorModes'] ?? null ) || ! $this->all_strings( $schema['editorModes'] ) || ! is_array( $schema['sectionDefinitions'] ?? null ) || ! is_array( $schema['sourceMappings'] ?? null ) ) {
			return false;
		}
		foreach ( $schema['editorModes'] as $mode ) {
			if ( ! in_array( $mode, Editor_Mode::VALID_MODES, true ) ) {
				return false;
			}
		}
		foreach ( $schema['sectionDefinitions'] as $definition ) {
			if ( ! is_array( $definition ) || ! is_string( $definition['type'] ?? null ) || ! is_array( $definition['fields'] ?? null ) ) {
				return false;
			}
			foreach ( $definition['fields'] as $field ) {
				if ( ! is_array( $field ) || ! is_string( $field['name'] ?? null ) || ! in_array( $field['type'] ?? null, array( 'string', 'number', 'boolean', 'json', 'media' ), true ) ) {
					return false;
				}
				if ( isset( $field['required'] ) && ! is_bool( $field['required'] ) ) {
					return false;
				}
			}
		}
		foreach ( $schema['sourceMappings'] as $source => $type ) {
			if ( ! is_string( $source ) || ! is_string( $type ) ) {
				return false;
			}
		}

		return true;
	}

	/** @param array<string, mixed> $capabilities */
	private function valid_capabilities( array $capabilities ): bool {
		if ( ! is_string( $capabilities['pluginVersion'] ?? null ) || ! is_string( $capabilities['wordpressVersion'] ?? null ) ) {
			return false;
		}
		foreach ( array( 'gutenberg', 'acf', 'acfPro', 'acfBlocks', 'flexibleContent' ) as $key ) {
			if ( ! isset( $capabilities[ $key ] ) || ! is_bool( $capabilities[ $key ] ) ) {
				return false;
			}
		}

		return is_array( $capabilities['editorModes'] ?? null ) && $this->all_strings( $capabilities['editorModes'] ) && is_array( $capabilities['sectionTypes'] ?? null ) && $this->all_strings( $capabilities['sectionTypes'] );
	}

	/** @param array<string, mixed> $data */
	private function valid_preview_token( array $data ): bool {
		return is_string( $data['token'] ?? null ) && is_string( $data['expiresAt'] ?? null );
	}

	/** @param array<int, mixed> $values */
	private function all_strings( array $values ): bool {
		foreach ( $values as $value ) {
			if ( ! is_string( $value ) ) {
				return false;
			}
		}

		return true;
	}

	/** @param mixed $value */
	private function is_json_value( $value, int $depth = 0 ): bool {
		if ( $depth > 30 ) {
			return false;
		}
		if ( null === $value || is_string( $value ) || is_int( $value ) || is_float( $value ) || is_bool( $value ) ) {
			return true;
		}
		if ( ! is_array( $value ) ) {
			return false;
		}
		foreach ( $value as $child ) {
			if ( ! $this->is_json_value( $child, $depth + 1 ) ) {
				return false;
			}
		}

		return true;
	}

	public static function sanitize_embed( string $html ): string {
		return wp_kses( $html, apply_filters( 'nexuscontent_embed_allowed_html', self::embed_allowed_html() ) );
	}

	/** @return array<string, array<string, bool>> */
	public static function embed_allowed_html(): array {
		return array(
			'iframe'   => array(
				'src'             => true,
				'title'           => true,
				'width'           => true,
				'height'          => true,
				'loading'         => true,
				'allow'           => true,
				'allowfullscreen' => true,
				'sandbox'         => true,
				'referrerpolicy'  => true,
				'class'           => true,
			),
			'form'     => array(
				'action' => true,
				'method' => true,
				'class'  => true,
				'id'     => true,
			),
			'label'    => array(
				'for'   => true,
				'class' => true,
			),
			'input'    => array(
				'type'        => true,
				'name'        => true,
				'value'       => true,
				'placeholder' => true,
				'required'    => true,
				'checked'     => true,
				'id'          => true,
				'class'       => true,
			),
			'textarea' => array(
				'name'        => true,
				'placeholder' => true,
				'required'    => true,
				'id'          => true,
				'class'       => true,
				'rows'        => true,
				'cols'        => true,
			),
			'select'   => array(
				'name'     => true,
				'required' => true,
				'id'       => true,
				'class'    => true,
			),
			'option'   => array(
				'value'    => true,
				'selected' => true,
			),
			'button'   => array(
				'type'  => true,
				'name'  => true,
				'value' => true,
				'class' => true,
				'id'    => true,
			),
			'div'      => array(
				'class' => true,
				'id'    => true,
			),
			'p'        => array( 'class' => true ),
			'span'     => array( 'class' => true ),
			'a'        => array(
				'href'   => true,
				'title'  => true,
				'target' => true,
				'rel'    => true,
				'class'  => true,
			),
			'br'       => array(),
		);
	}
}
