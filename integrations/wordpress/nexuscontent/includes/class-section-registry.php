<?php
/**
 * Canonical section definitions and aliases.
 *
 * @package NexusContentCompanion
 */

namespace NexusContent\Companion;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Section_Registry {
	public const TYPES        = array(
		'hero',
		'intro',
		'rich_text',
		'image_text',
		'features',
		'statistics',
		'testimonials',
		'gallery',
		'cta',
		'faq',
		'logo_grid',
		'form_embed',
	);
	public const SOURCE_NAMES = array(
		'hero'         => 'hero',
		'intro'        => 'intro',
		'rich_text'    => 'rich-text',
		'image_text'   => 'image-text',
		'features'     => 'features',
		'statistics'   => 'statistics',
		'testimonials' => 'testimonials',
		'gallery'      => 'gallery',
		'cta'          => 'cta',
		'faq'          => 'faq',
		'logo_grid'    => 'logo-grid',
		'form_embed'   => 'form-embed',
	);

	/** @var array<string, array<string, mixed>>|null */
	private ?array $definitions = null;

	/** @var array<string, array<string, mixed>>|null */
	private static ?array $json_cache = null;

	/** @return array<string, array<string, mixed>> */
	public function definitions(): array {
		if ( null !== $this->definitions ) {
			return $this->definitions;
		}

		$base = $this->json_definitions();

		/**
		 * Filters canonical section definitions used by normalizers and schema output.
		 *
		 * Definitions may contain internal callbacks, but callbacks are never included
		 * in REST metadata. The built-in sections arrive from sections.json at the
		 * plugin root; this filter adds or replaces definitions for a specific site.
		 *
		 * @param array<string, array<string, mixed>> $definitions Definitions keyed by canonical type.
		 */
		$filtered          = apply_filters( 'nexuscontent_section_definitions', $base );
		$this->definitions = $this->normalize_definitions( is_array( $filtered ) ? $filtered : $base );

		return $this->definitions;
	}

	/** @return array<string, array<string, mixed>> */
	private function json_definitions(): array {
		if ( null !== self::$json_cache ) {
			return self::$json_cache;
		}

		$result = array();
		$path   = dirname( __DIR__ ) . '/sections.json';
		if ( ! file_exists( $path ) ) {
			self::$json_cache = $result;
			return $result;
		}

		$contents = file_get_contents( $path );
		$data     = json_decode( $contents ? $contents : '', true );
		if ( ! is_array( $data ) || ! isset( $data['sections'] ) || ! is_array( $data['sections'] ) ) {
			self::$json_cache = $result;
			return $result;
		}

		foreach ( $data['sections'] as $section ) {
			if ( ! is_array( $section ) || ! is_string( $section['type'] ?? null ) ) {
				continue;
			}
			$type = sanitize_key( $section['type'] );
			if ( '' === $type ) {
				continue;
			}

			$definition = array();
			if ( ! empty( $section['fixed'] ) ) {
				$definition['fixed'] = true;
			}
			if ( is_string( $section['label'] ?? null ) && '' !== trim( $section['label'] ) ) {
				$definition['label'] = $section['label'];
			}
			$fields = array();
			if ( isset( $section['fields'] ) && is_array( $section['fields'] ) ) {
				foreach ( $section['fields'] as $field ) {
					if ( ! is_array( $field ) || ! is_string( $field['name'] ?? null ) || ! is_string( $field['type'] ?? null ) ) {
						continue;
					}
					$item = array(
						'name' => sanitize_key( $field['name'] ),
						'type' => sanitize_key( $field['type'] ),
					);
					if ( isset( $field['required'] ) ) {
						$item['required'] = (bool) $field['required'];
					}
					if ( array_key_exists( 'default', $field ) && ( is_scalar( $field['default'] ) || null === $field['default'] ) ) {
						$item['default'] = $field['default'];
					}
					$fields[] = $item;
				}
			}
			$definition['fields'] = $fields;
			$result[ $type ]      = $definition;
		}

		self::$json_cache = $result;
		return $result;
	}

	public function resolve( string $source ): ?string {
		$source = sanitize_key( str_replace( array( '/', '-' ), '_', $source ) );
		foreach ( $this->definitions() as $type => $definition ) {
			foreach ( $definition['aliases'] as $alias ) {
				if ( sanitize_key( str_replace( array( '/', '-' ), '_', $alias ) ) === $source ) {
					return $type;
				}
			}
		}

		return null;
	}

	/**
	 * Canonical human-readable label for a section type.
	 *
	 * The canonical English label lives in sections.json; translation is
	 * applied through WordPress text functions so existing translations
	 * keep working.
	 *
	 * @param string $type Section type.
	 */
	public function label( string $type ): string {
		$type       = str_replace( '-', '_', $type );
		$definition = $this->definitions()[ $type ] ?? null;
		if ( is_array( $definition ) && is_string( $definition['label'] ?? null ) && '' !== trim( $definition['label'] ) ) {
			// The canonical label lives in sections.json; translate() keeps the
			// standard text domain pipe open for customised labels too.
			// phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText
			return __( $definition['label'], 'nexuscontent' );
		}

		// The generated fallback label never ships in the JSON; it only covers
		// custom sections filtered in without a label.
		// phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText
		return __( ucwords( str_replace( '_', ' ', $type ) ), 'nexuscontent' );
	}

	/** @return array<int, string> Canonical types flagged as fixed sections in sections.json. */
	public function fixed_types(): array {
		$types = array();
		foreach ( $this->definitions() as $type => $definition ) {
			if ( ! empty( $definition['fixed'] ) ) {
				$types[] = $type;
			}
		}

		return $types;
	}

	/**
	 * Meta keys for the fixed editor-mode fields, derived from the canonical
	 * section field lists. Single source for normalizer and block-modal checks.
	 *
	 * @return array<int, string>
	 */
	public function fixed_field_keys(): array {
		$keys = array();
		foreach ( $this->definitions() as $type => $definition ) {
			if ( empty( $definition['fixed'] ) ) {
				continue;
			}
			$keys[] = $type . '_enabled';
			foreach ( $definition['fields'] as $field ) {
				if ( is_array( $field ) && is_string( $field['name'] ?? null ) ) {
					$keys[] = $type . '_' . $field['name'];
				}
			}
		}

		return $keys;
	}

	/** @return array<int, array<string, mixed>> */
	public function rest_definitions(): array {
		$result = array();
		foreach ( $this->definitions() as $definition ) {
			$result[] = array(
				'type'   => $definition['type'],
				'fields' => $this->safe_fields( $definition['fields'] ),
			);
		}

		return $result;
	}

	/** @return array<string, string> */
	public function source_mappings(): array {
		$result = array();
		foreach ( $this->definitions() as $type => $definition ) {
			foreach ( $definition['aliases'] as $alias ) {
				$result[ $alias ] = $type;
			}
		}

		return $result;
	}

	/** @param array<string, mixed> $definitions @return array<string, array<string, mixed>> */
	private function normalize_definitions( array $definitions ): array {
		$result = array();
		$types  = array_values( array_unique( array_merge( self::TYPES, array_keys( $definitions ) ) ) );
		foreach ( $types as $raw_type ) {
			$type = sanitize_key( (string) $raw_type );
			if ( '' === $type ) {
				continue;
			}
			$value           = $definitions[ $type ] ?? array();
			$value           = is_array( $value ) ? $value : array();
			$source_name     = self::SOURCE_NAMES[ $type ] ?? str_replace( '_', '-', $type );
			$aliases         = isset( $value['aliases'] ) && is_array( $value['aliases'] ) ? array_map( 'strval', $value['aliases'] ) : array();
			$aliases         = array_values( array_unique( array_merge( array( 'nexuscontent/' . $source_name, 'acf/' . $source_name, $source_name, $type ), $aliases ) ) );
			$result[ $type ] = array_merge(
				$value,
				array(
					'type'       => $type,
					'sourceType' => 'nexuscontent/' . $source_name,
					'sourceKey'  => isset( $value['sourceKey'] ) && is_string( $value['sourceKey'] ) ? $value['sourceKey'] : 'acf/' . $source_name,
					'aliases'    => $aliases,
					'fields'     => isset( $value['fields'] ) && is_array( $value['fields'] ) ? $value['fields'] : array(),
				)
			);
		}

		return $result;
	}

	/** @param array<int, mixed> $fields @return array<int, array<string, mixed>> */
	private function safe_fields( array $fields ): array {
		$result = array();
		foreach ( $fields as $field ) {
			if ( ! is_array( $field ) || ! is_string( $field['name'] ?? null ) || ! is_string( $field['type'] ?? null ) ) {
				continue;
			}
			$item = array(
				'name' => sanitize_key( $field['name'] ),
				'type' => sanitize_key( $field['type'] ),
			);
			if ( isset( $field['required'] ) ) {
				$item['required'] = (bool) $field['required'];
			}
			if ( array_key_exists( 'default', $field ) && ( is_scalar( $field['default'] ) || null === $field['default'] || is_array( $field['default'] ) ) ) {
				$item['default'] = $field['default'];
			}
			$result[] = $item;
		}

		return $result;
	}
}
