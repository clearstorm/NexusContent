<?php

namespace NexusContent\Companion\Tests\Unit;

require_once dirname( __DIR__ ) . '/bootstrap.php';
require_once dirname( __DIR__ ) . '/TestCase.php';

use NexusContent\Companion\Seo_Fields;
use NexusContent\Companion\Site_Settings;
use NexusContent\Companion\Tests\TestCase;

final class SeoAndSettingsTest extends TestCase {
	public function test_seo_fields_normalize_authored_meta_and_preserve_false_robots_values(): void {
		$GLOBALS['nc_test']['meta'][42] = array(
			'nexus_seo_title'             => 'Search title',
			'nexus_seo_description'       => 'Search description',
			'nexus_seo_canonical'         => 'https://example.test/page',
			'nexus_seo_robots_index'      => 0,
			'nexus_seo_robots_follow'     => 0,
			'nexus_seo_robots_noarchive'  => 1,
			'nexus_seo_robots_nosnippet'  => 0,
			'nexus_seo_og_title'          => 'OpenGraph title',
			'nexus_seo_og_image'          => 'https://example.test/og.jpg',
			'nexus_seo_tw_card'           => 'summary_large_image',
			'nexus_seo_tw_title'          => 'Twitter title',
			'nexus_seo_tw_image'          => 'https://example.test/twitter.jpg',
			'nexus_seo_tw_site'           => '@example',
		);

		$seo = ( new Seo_Fields() )->read( 42 );
		self::assertSame( 'Search title', $seo['title'] );
		self::assertSame( 'https://example.test/page', $seo['canonicalUrl'] );
		self::assertSame( array( 'index' => false, 'follow' => false, 'noarchive' => true, 'nosnippet' => false ), $seo['robots'] );
		self::assertSame( array( 'url' => 'https://example.test/og.jpg' ), $seo['openGraph']['image'] );
		self::assertSame( 'summary_large_image', $seo['twitter']['card'] );
		self::assertSame( '@example', $seo['twitter']['site'] );
		self::assertSame( $seo, $this->normalizedPage( $this->post() )['seo'] );
	}

	public function test_empty_seo_is_omitted_from_normalized_pages(): void {
		self::assertSame( array(), ( new Seo_Fields() )->read( 42 ) );
		self::assertArrayNotHasKey( 'seo', $this->normalizedPage( $this->post() ) );
	}

	public function test_contract_rejects_malformed_seo(): void {
		$page        = $this->normalizedPage( $this->post() );
		$page['seo'] = array( 'robots' => array( 'index' => 'yes' ) );
		self::assertFalse( ( new \NexusContent\Companion\Contract() )->validate( array( 'contractVersion' => 1, 'data' => $page ), 'page' ) );

		$page['seo'] = array( 'openGraph' => array( 'image' => array( 'alt' => 'Missing URL' ) ) );
		self::assertFalse( ( new \NexusContent\Companion\Contract() )->validate( array( 'contractVersion' => 1, 'data' => $page ), 'page' ) );
	}

	public function test_site_settings_prefer_option_fields_and_normalize_logo(): void {
		$GLOBALS['nc_test']['options']['admin_email'] = 'admin@example.test';
		$GLOBALS['nc_test']['fields']['option'] = array(
			'nexus_site_name'             => 'Authored site',
			'nexus_site_tagline'          => 'Authored tagline',
			'nexus_site_url'              => 'https://site.example.test',
			'nexus_site_email'            => 'hello@example.test',
			'nexus_site_phone'            => '+27 10 000 0000',
			'nexus_site_address'          => 'Cape Town',
			'nexus_site_language'         => 'en-ZA',
			'nexus_site_logo'             => array( 'url' => 'https://site.example.test/logo.png', 'alt' => 'Site logo', 'width' => '200', 'height' => 80 ),
			'nexus_site_social'            => array( 'facebook' => 'https://facebook.com/example', 'twitter' => 'https://twitter.com/example' ),
		);

		$settings = ( new Site_Settings() )->read();
		self::assertSame( 'Authored site', $settings['name'] );
		self::assertSame( 'https://site.example.test', $settings['url'] );
		self::assertSame( 'en-ZA', $settings['language'] );
		self::assertSame( array( 'alt' => 'Site logo', 'width' => 200, 'height' => 80, 'src' => 'https://site.example.test/logo.png' ), $settings['logo'] );
		self::assertSame( array( 'facebook' => 'https://facebook.com/example', 'twitter' => 'https://twitter.com/example' ), $settings['social'] );
	}

	public function test_site_settings_fall_back_to_wordpress_core_values(): void {
		self::assertSame(
			array(
				'name' => 'Example site', 'tagline' => 'Example tagline', 'url' => 'https://example.test/',
				'language' => 'en-US', 'email' => '', 'phone' => '', 'address' => '',
			),
			( new Site_Settings() )->read()
		);
	}
}
