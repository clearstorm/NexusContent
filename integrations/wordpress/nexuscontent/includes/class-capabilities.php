<?php
/**
 * Runtime capability detection.
 *
 * @package NexusContentCompanion
 */

namespace NexusContent\Companion;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Capabilities {
	private Section_Registry $registry;

	public function __construct( ?Section_Registry $registry = null ) {
		$this->registry = $registry ?? new Section_Registry();
	}

	/** @return array<string, mixed> */
	public function get(): array {
		global $wp_version;

		$modes = $this->editor_modes();
		$acf   = $this->has_acf();
		$data  = array(
			'pluginVersion'    => NEXUSCONTENT_COMPANION_VERSION,
			'wordpressVersion' => is_string( $wp_version ) ? $wp_version : '',
			'gutenberg'        => $this->has_block_editor(),
			'acf'              => $acf,
			'acfPro'           => $acf && function_exists( 'acf_get_setting' ) && (bool) acf_get_setting( 'pro' ),
			'acfBlocks'        => $acf && function_exists( 'acf_register_block_type' ),
			'flexibleContent'  => $this->has_acf_field_type( 'flexible_content' ),
			'editorModes'      => $modes,
			'sectionTypes'     => array_keys( $this->registry->definitions() ),
		);
		if ( $acf && defined( 'ACF_VERSION' ) ) {
			$data['acfVersion'] = (string) ACF_VERSION;
		}

		/**
		 * Filters the public capability report.
		 *
		 * Values are narrowed by Capabilities::sanitize() before REST output.
		 *
		 * @param array<string, mixed> $data Capability report.
		 */
		return $this->sanitize( apply_filters( 'nexuscontent_capabilities', $data ) );
	}

	/** @return array<int, string> */
	public function editor_modes(): array {
		$modes = array();
		if ( $this->has_block_editor() ) {
			$modes[] = Editor_Mode::GUTENBERG;
		}
		if ( $this->has_acf() ) {
			if ( $this->has_acf_field_type( 'flexible_content' ) ) {
				$modes[] = Editor_Mode::ACF_FLEXIBLE;
			}
			if ( $this->has_supported_acf() ) {
				$modes[] = Editor_Mode::ACF_FIXED;
			}
		}

		/**
		 * Filters editor modes supported by the current WordPress installation.
		 *
		 * @param array<int, string> $modes Supported mode identifiers.
		 */
		$filtered = apply_filters( 'nexuscontent_supported_editor_modes', $modes );
		if ( ! is_array( $filtered ) ) {
			return $modes;
		}

		return array_values( array_intersect( Editor_Mode::VALID_MODES, array_map( 'strval', $filtered ) ) );
	}

	public function supports_mode( string $mode ): bool {
		return in_array( $mode, $this->editor_modes(), true );
	}

	private function has_acf(): bool {
		return function_exists( 'get_field' ) && ( class_exists( 'ACF' ) || defined( 'ACF_VERSION' ) );
	}

	private function has_block_editor(): bool {
		return post_type_supports( 'page', 'editor' ) && ( ! function_exists( 'use_block_editor_for_post_type' ) || use_block_editor_for_post_type( 'page' ) );
	}

	private function has_acf_field_type( string $type ): bool {
		return $this->has_supported_acf() && function_exists( 'acf_get_field_type' ) && (bool) acf_get_field_type( $type );
	}

	private function has_supported_acf(): bool {
		return $this->has_acf() && ( ! defined( 'ACF_VERSION' ) || version_compare( (string) ACF_VERSION, '6.2', '>=' ) );
	}

	/** @param mixed $value @return array<string, mixed> */
	private function sanitize( $value ): array {
		$source = is_array( $value ) ? $value : array();
		$result = array(
			'pluginVersion'    => sanitize_text_field( (string) ( $source['pluginVersion'] ?? NEXUSCONTENT_COMPANION_VERSION ) ),
			'wordpressVersion' => sanitize_text_field( (string) ( $source['wordpressVersion'] ?? '' ) ),
		);
		foreach ( array( 'gutenberg', 'acf', 'acfPro', 'acfBlocks', 'flexibleContent' ) as $key ) {
			$result[ $key ] = (bool) ( $source[ $key ] ?? false );
		}
		if ( isset( $source['acfVersion'] ) && is_string( $source['acfVersion'] ) ) {
			$result['acfVersion'] = sanitize_text_field( $source['acfVersion'] );
		}
		$result['editorModes']  = isset( $source['editorModes'] ) && is_array( $source['editorModes'] )
			? array_values( array_intersect( Editor_Mode::VALID_MODES, array_map( 'strval', $source['editorModes'] ) ) )
			: $this->editor_modes();
		$registered_types       = array_keys( $this->registry->definitions() );
		$result['sectionTypes'] = isset( $source['sectionTypes'] ) && is_array( $source['sectionTypes'] )
			? array_values( array_intersect( $registered_types, array_map( 'strval', $source['sectionTypes'] ) ) )
			: $registered_types;

		return $result;
	}
}
