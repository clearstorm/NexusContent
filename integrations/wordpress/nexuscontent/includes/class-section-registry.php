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

	private const FIELDS = array(
		'hero'         => array(
			array(
				'name' => 'section_id',
				'type' => 'string',
			),
			array(
				'name' => 'variant',
				'type' => 'string',
			),
			array(
				'name' => 'eyebrow',
				'type' => 'string',
			),
			array(
				'name' => 'heading',
				'type' => 'string',
			),
			array(
				'name' => 'body',
				'type' => 'string',
			),
			array(
				'name' => 'image',
				'type' => 'media',
			),
			array(
				'name' => 'primary_action_label',
				'type' => 'string',
			),
			array(
				'name' => 'primary_action_url',
				'type' => 'string',
			),
			array(
				'name' => 'secondary_action_label',
				'type' => 'string',
			),
			array(
				'name' => 'secondary_action_url',
				'type' => 'string',
			),
			array(
				'name' => 'theme',
				'type' => 'string',
			),
		),
		'intro'        => array(
			array(
				'name' => 'section_id',
				'type' => 'string',
			),
			array(
				'name' => 'variant',
				'type' => 'string',
			),
			array(
				'name' => 'eyebrow',
				'type' => 'string',
			),
			array(
				'name' => 'heading',
				'type' => 'string',
			),
			array(
				'name' => 'body',
				'type' => 'string',
			),
			array(
				'name' => 'image',
				'type' => 'media',
			),
			array(
				'name' => 'image_position',
				'type' => 'string',
			),
			array(
				'name' => 'theme',
				'type' => 'string',
			),
		),
		'rich_text'    => array(
			array(
				'name' => 'section_id',
				'type' => 'string',
			),
			array(
				'name' => 'variant',
				'type' => 'string',
			),
			array(
				'name' => 'heading',
				'type' => 'string',
			),
			array(
				'name' => 'body',
				'type' => 'string',
			),
			array(
				'name' => 'theme',
				'type' => 'string',
			),
		),
		'image_text'   => array(
			array(
				'name' => 'section_id',
				'type' => 'string',
			),
			array(
				'name' => 'variant',
				'type' => 'string',
			),
			array(
				'name' => 'eyebrow',
				'type' => 'string',
			),
			array(
				'name' => 'heading',
				'type' => 'string',
			),
			array(
				'name' => 'body',
				'type' => 'string',
			),
			array(
				'name' => 'image',
				'type' => 'media',
			),
			array(
				'name' => 'image_position',
				'type' => 'string',
			),
			array(
				'name' => 'action_label',
				'type' => 'string',
			),
			array(
				'name' => 'action_url',
				'type' => 'string',
			),
			array(
				'name' => 'theme',
				'type' => 'string',
			),
		),
		'features'     => array(
			array(
				'name' => 'section_id',
				'type' => 'string',
			),
			array(
				'name' => 'variant',
				'type' => 'string',
			),
			array(
				'name' => 'eyebrow',
				'type' => 'string',
			),
			array(
				'name' => 'heading',
				'type' => 'string',
			),
			array(
				'name' => 'body',
				'type' => 'string',
			),
			array(
				'name' => 'items',
				'type' => 'json',
			),
			array(
				'name' => 'theme',
				'type' => 'string',
			),
		),
		'statistics'   => array(
			array(
				'name' => 'section_id',
				'type' => 'string',
			),
			array(
				'name' => 'variant',
				'type' => 'string',
			),
			array(
				'name' => 'eyebrow',
				'type' => 'string',
			),
			array(
				'name' => 'heading',
				'type' => 'string',
			),
			array(
				'name' => 'items',
				'type' => 'json',
			),
			array(
				'name' => 'theme',
				'type' => 'string',
			),
		),
		'testimonials' => array(
			array(
				'name' => 'section_id',
				'type' => 'string',
			),
			array(
				'name' => 'variant',
				'type' => 'string',
			),
			array(
				'name' => 'eyebrow',
				'type' => 'string',
			),
			array(
				'name' => 'heading',
				'type' => 'string',
			),
			array(
				'name' => 'items',
				'type' => 'json',
			),
			array(
				'name' => 'theme',
				'type' => 'string',
			),
		),
		'gallery'      => array(
			array(
				'name' => 'section_id',
				'type' => 'string',
			),
			array(
				'name' => 'variant',
				'type' => 'string',
			),
			array(
				'name' => 'eyebrow',
				'type' => 'string',
			),
			array(
				'name' => 'heading',
				'type' => 'string',
			),
			array(
				'name' => 'images',
				'type' => 'json',
			),
			array(
				'name' => 'theme',
				'type' => 'string',
			),
		),
		'cta'          => array(
			array(
				'name' => 'section_id',
				'type' => 'string',
			),
			array(
				'name' => 'variant',
				'type' => 'string',
			),
			array(
				'name' => 'heading',
				'type' => 'string',
			),
			array(
				'name' => 'body',
				'type' => 'string',
			),
			array(
				'name' => 'primary_action_label',
				'type' => 'string',
			),
			array(
				'name' => 'primary_action_url',
				'type' => 'string',
			),
			array(
				'name' => 'secondary_action_label',
				'type' => 'string',
			),
			array(
				'name' => 'secondary_action_url',
				'type' => 'string',
			),
			array(
				'name' => 'background_image',
				'type' => 'media',
			),
			array(
				'name' => 'theme',
				'type' => 'string',
			),
		),
		'faq'          => array(
			array(
				'name' => 'section_id',
				'type' => 'string',
			),
			array(
				'name' => 'variant',
				'type' => 'string',
			),
			array(
				'name' => 'eyebrow',
				'type' => 'string',
			),
			array(
				'name' => 'heading',
				'type' => 'string',
			),
			array(
				'name' => 'items',
				'type' => 'json',
			),
			array(
				'name' => 'theme',
				'type' => 'string',
			),
		),
		'logo_grid'    => array(
			array(
				'name' => 'section_id',
				'type' => 'string',
			),
			array(
				'name' => 'variant',
				'type' => 'string',
			),
			array(
				'name' => 'eyebrow',
				'type' => 'string',
			),
			array(
				'name' => 'heading',
				'type' => 'string',
			),
			array(
				'name' => 'items',
				'type' => 'json',
			),
			array(
				'name' => 'theme',
				'type' => 'string',
			),
		),
		'form_embed'   => array(
			array(
				'name' => 'section_id',
				'type' => 'string',
			),
			array(
				'name' => 'variant',
				'type' => 'string',
			),
			array(
				'name' => 'heading',
				'type' => 'string',
			),
			array(
				'name' => 'provider',
				'type' => 'string',
			),
			array(
				'name' => 'form_id',
				'type' => 'string',
			),
			array(
				'name' => 'embed_code',
				'type' => 'string',
			),
			array(
				'name' => 'theme',
				'type' => 'string',
			),
		),
	);

	/** @return array<string, array<string, mixed>> */
	public function definitions(): array {
		if ( null !== $this->definitions ) {
			return $this->definitions;
		}

		$definitions = array();
		foreach ( self::TYPES as $type ) {
			$source_name          = self::SOURCE_NAMES[ $type ];
			$definitions[ $type ] = array(
				'type'       => $type,
				'sourceType' => 'nexuscontent/' . $source_name,
				'sourceKey'  => 'acf/' . $source_name,
				'aliases'    => array( 'nexuscontent/' . $source_name, 'acf/' . $source_name, $source_name, $type ),
				'fields'     => self::FIELDS[ $type ],
			);
		}

		/**
		 * Filters canonical section definitions used by normalizers and schema output.
		 *
		 * Definitions may contain internal callbacks, but callbacks are never included
		 * in REST metadata.
		 *
		 * @param array<string, array<string, mixed>> $definitions Definitions keyed by canonical type.
		 */
		$filtered          = apply_filters( 'nexuscontent_section_definitions', $definitions );
		$this->definitions = $this->normalize_definitions( is_array( $filtered ) ? $filtered : $definitions );

		return $this->definitions;
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
					'fields'     => isset( $value['fields'] ) && is_array( $value['fields'] ) ? $value['fields'] : ( self::FIELDS[ $type ] ?? array() ),
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
