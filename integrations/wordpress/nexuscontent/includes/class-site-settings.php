<?php
/**
 * Site-wide settings normalization.
 *
 * Preferences ACF/SCF option-page values when an option page is registered;
 * otherwise falls back to WordPress core settings so `/nexuscontent/v1/settings`
 * always returns a useful shape regardless of the installed field plugin.
 *
 * @package NexusContentCompanion
 */

namespace NexusContent\Companion;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Site_Settings {
	public const OPTION_GROUP_KEY = 'group_nc_site_settings';

	public const FIELD_KEYS = array(
		'name'             => 'nexus_site_name',
		'tagline'          => 'nexus_site_tagline',
		'url'              => 'nexus_site_url',
		'email'            => 'nexus_site_email',
		'phone'            => 'nexus_site_phone',
		'address'          => 'nexus_site_address',
		'language'         => 'nexus_site_language',
		'logo'             => 'nexus_site_logo',
		'social_facebook'  => 'nexus_site_social_facebook',
		'social_twitter'   => 'nexus_site_social_twitter',
		'social_instagram' => 'nexus_site_social_instagram',
		'social_linkedin'  => 'nexus_site_social_linkedin',
	);

	/**
	 * Normalize site settings into a provider-neutral settings map.
	 *
	 * @return array<string, mixed>
	 */
	public function read(): array {
		$data             = array();
		$data['name']     = $this->field_or( 'name', get_bloginfo( 'name' ) );
		$data['tagline']  = $this->field_or( 'tagline', get_bloginfo( 'description' ) );
		$data['url']      = $this->field_url( 'url', home_url() );
		$data['language'] = $this->field_or( 'language', get_bloginfo( 'language' ) );
		$data['email']    = $this->field_or( 'email', '' );
		$data['phone']    = $this->field_or( 'phone', '' );
		$data['address']  = $this->field_or( 'address', '' );

		$logo = $this->logo();
		if ( $logo ) {
			$data['logo'] = $logo;
		}

		$social = $this->social();
		if ( $social ) {
			$data['social'] = $social;
		}

		/**
		 * Filters normalized site settings before REST output.
		 *
		 * @param array<string, mixed> $data Normalized settings.
		 */
		$filtered = apply_filters( 'nexuscontent_site_settings', $data );
		return is_array( $filtered ) ? $filtered : $data;
	}

	/** @return array<string, string> */
	private function social(): array {
		$group = function_exists( 'get_field' ) ? get_field( 'nexus_site_social', 'option' ) : null;
		$out   = array();
		foreach ( array( 'facebook', 'twitter', 'instagram', 'linkedin' ) as $network ) {
			$value = is_array( $group ) && is_string( $group[ $network ] ?? null ) ? trim( $group[ $network ] ) : $this->field_or( 'social_' . $network, '' );
			if ( '' !== $value ) {
				$out[ $network ] = $value;
			}
		}
		return $out;
	}

	private function field_or( string $key, string $fallback ): string {
		$value = $this->option_field( $key );
		return '' !== $value ? $value : $fallback;
	}

	private function field_url( string $key, string $fallback ): string {
		$value = $this->option_field( $key );
		return '' !== $value ? esc_url_raw( $value ) : $fallback;
	}

	private function option_field( string $key ): string {
		if ( ! isset( self::FIELD_KEYS[ $key ] ) || ! function_exists( 'get_field' ) ) {
			return '';
		}
		$value = get_field( self::FIELD_KEYS[ $key ], 'option' );
		if ( is_string( $value ) ) {
			return trim( $value );
		}
		if ( is_numeric( $value ) ) {
			return (string) $value;
		}
		return '';
	}

	/**
	 * ACF image fields return an array (id, url, width, height, alt). Media is
	 * exposed as a provider-neutral object with `url`.
	 *
	 * @return array<string, mixed>|null
	 */
	private function logo(): ?array {
		if ( ! function_exists( 'get_field' ) ) {
			return null;
		}
		$value = get_field( self::FIELD_KEYS['logo'], 'option' );
		if ( ! is_array( $value ) || ! isset( $value['url'] ) || ! is_string( $value['url'] ) ) {
			return null;
		}
		$logo = array( 'url' => esc_url_raw( $value['url'] ) );
		if ( isset( $value['alt'] ) && is_string( $value['alt'] ) && '' !== $value['alt'] ) {
			$logo['alt'] = $value['alt'];
		}
		if ( isset( $value['width'] ) && is_numeric( $value['width'] ) ) {
			$logo['width'] = (int) $value['width'];
		}
		if ( isset( $value['height'] ) && is_numeric( $value['height'] ) ) {
			$logo['height'] = (int) $value['height'];
		}
		$logo = $this->normalize_media( $logo );
		return $logo;
	}

	/**
	 * Maps the wire `url` key to the normalized MediaAsset `src` key so
	 * consumers see a provider-neutral media shape.
	 *
	 * @param array<string, mixed> $asset Asset array.
	 * @return array<string, mixed>
	 */
	private function normalize_media( array $asset ): array {
		if ( isset( $asset['url'] ) ) {
			$asset['src'] = $asset['url'];
			unset( $asset['url'] );
		}
		return $asset;
	}
}
