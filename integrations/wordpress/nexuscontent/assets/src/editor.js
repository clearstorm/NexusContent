import './editor.css';

( function ( wp, settings ) {
	'use strict';

	if (
		! wp ||
		! wp.blocks ||
		! wp.element ||
		! wp.blockEditor ||
		! wp.components
	) {
		return;
	}
	if ( ! settings || ! Array.isArray( settings.nativeTypes ) ) {
		return;
	}

	const el = wp.element.createElement;
	const Fragment = wp.element.Fragment;
	const useEffect = wp.element.useEffect;
	const useRef = wp.element.useRef;
	const useState = wp.element.useState;
	const InspectorControls = wp.blockEditor.InspectorControls;
	const MediaUpload = wp.blockEditor.MediaUpload;
	const MediaUploadCheck = wp.blockEditor.MediaUploadCheck;
	const RichText = wp.blockEditor.RichText;
	const useBlockProps = wp.blockEditor.useBlockProps;
	const Button = wp.components.Button;
	const PanelBody = wp.components.PanelBody;
	const SelectControl = wp.components.SelectControl;
	const TextControl = wp.components.TextControl;
	const TextareaControl = wp.components.TextareaControl;
	const definitions = {
		hero: [
			'section_id',
			'variant',
			'eyebrow',
			'heading',
			'body',
			'image',
			'buttons',
			'theme',
		],
		intro: [
			'section_id',
			'variant',
			'eyebrow',
			'heading',
			'body',
			'image',
			'image_position',
			'theme',
		],
		'rich-text': [ 'section_id', 'variant', 'heading', 'body', 'theme' ],
		'image-text': [
			'section_id',
			'variant',
			'eyebrow',
			'heading',
			'body',
			'image',
			'image_position',
			'buttons',
			'theme',
		],
		features: [
			'section_id',
			'variant',
			'eyebrow',
			'heading',
			'body',
			'items',
			'theme',
		],
		statistics: [
			'section_id',
			'variant',
			'eyebrow',
			'heading',
			'items',
			'theme',
		],
		testimonials: [
			'section_id',
			'variant',
			'eyebrow',
			'heading',
			'items',
			'theme',
		],
		gallery: [
			'section_id',
			'variant',
			'eyebrow',
			'heading',
			'images',
			'theme',
		],
		cta: [
			'section_id',
			'variant',
			'heading',
			'body',
			'buttons',
			'background_image',
			'theme',
		],
		faq: [
			'section_id',
			'variant',
			'eyebrow',
			'heading',
			'items',
			'theme',
		],
		'logo-grid': [
			'section_id',
			'variant',
			'eyebrow',
			'heading',
			'items',
			'theme',
		],
		'form-embed': [
			'section_id',
			'variant',
			'heading',
			'provider',
			'form_id',
			'embed_code',
			'theme',
		],
	};
	const titles = {
		hero: 'Hero',
		intro: 'Introduction',
		'rich-text': 'Rich Text',
		'image-text': 'Image and Text',
		features: 'Features',
		statistics: 'Statistics',
		testimonials: 'Testimonials',
		gallery: 'Gallery',
		cta: 'Call to Action',
		faq: 'FAQ',
		'logo-grid': 'Logo Grid',
		'form-embed': 'Form Embed',
	};
	const mediaFields = [ 'image', 'background_image' ];

	const sidebarHiddenFields = [
		'form_id',
		'heading',
		'body',
		'items',
		'buttons',
		'eyebrow',
	];
	const settingsFields = [ 'section_id', 'variant', 'theme' ];

	function attributesFor( fields ) {
		const attributes = {};
		fields.forEach( function ( field ) {
			attributes[ field ] = { type: 'string', default: '' };
			if (
				'items' === field ||
				'images' === field ||
				'buttons' === field
			) {
				attributes[ field ] = { type: 'array', default: [] };
			} else if ( mediaFields.indexOf( field ) !== -1 ) {
				attributes[ field ] = { type: 'object', default: {} };
			}
		} );
		attributes.preview = { type: 'boolean', default: false };
		return attributes;
	}

	function PreviewImage( props ) {
		return el( 'img', {
			className: 'nc-block-preview-image',
			src: settings.previewBaseUrl + props.type + '.svg',
			alt: titles[ props.type ] + ' block preview',
		} );
	}

	function mediaValue( media ) {
		return {
			id: media.id,
			url: media.url,
			alt: media.alt || '',
			width: media.width,
			height: media.height,
		};
	}

	function slugify( text ) {
		if ( ! text || 'string' !== typeof text ) {
			return '';
		}
		return text
			.toLowerCase()
			.replace( /<[^>]*>/g, '' )
			.replace( /[^a-z0-9]+/g, '-' )
			.replace( /^-+|-+$/g, '' );
	}

	/* ---------------------------------------------------------------
	 * Sidebar controls
	 * --------------------------------------------------------------- */

	function MediaControl( props ) {
		const value = props.value || {};
		return el(
			'div',
			{ className: 'nexuscontent-media-control' },
			value.url
				? el( 'img', { src: value.url, alt: value.alt || '' } )
				: null,
			el(
				MediaUploadCheck,
				{},
				el( MediaUpload, {
					allowedTypes: [ 'image' ],
					value: value.id,
					onSelect( media ) {
						props.onChange( mediaValue( media ) );
					},
					render( state ) {
						return el(
							Button,
							{ variant: 'secondary', onClick: state.open },
							value.url ? 'Replace image' : 'Choose image'
						);
					},
				} )
			),
			value.url
				? el(
						Button,
						{
							isDestructive: true,
							variant: 'tertiary',
							onClick() {
								props.onChange( {} );
							},
						},
						'Remove'
				  )
				: null
		);
	}

	function GalleryControl( props ) {
		const images = props.value || [];
		return el(
			Fragment,
			{},
			el(
				'div',
				{ className: 'nexuscontent-gallery-preview' },
				images.map( function ( image, index ) {
					return el( 'img', {
						key: image.id || index,
						src: image.url,
						alt: image.alt || '',
					} );
				} )
			),
			el(
				MediaUploadCheck,
				{},
				el( MediaUpload, {
					multiple: true,
					gallery: true,
					allowedTypes: [ 'image' ],
					value: images.map( function ( image ) {
						return image.id;
					} ),
					onSelect( selected ) {
						props.onChange( selected.map( mediaValue ) );
					},
					render( state ) {
						return el(
							Button,
							{ variant: 'secondary', onClick: state.open },
							images.length ? 'Edit gallery' : 'Choose images'
						);
					},
				} )
			)
		);
	}

	/* ---------------------------------------------------------------
	 * RepeatControl – structured item editor
	 * --------------------------------------------------------------- */

	/**
	 * @param {Object}   props
	 * @param {string}   props.label     Section heading.
	 * @param {Array}    props.value     Current items array.
	 * @param {Function} props.onChange  Change handler.
	 * @param {Array}    props.fieldDefs Item field definitions [{ key, label, type }].
	 */
	function RepeatControl( props ) {
		const items = Array.isArray( props.value ) ? props.value : [];
		const fieldDefs = props.fieldDefs || [];
		const [ collapsed, setCollapsed ] = useState( {} );

		function addItem() {
			const next = items.concat( [ {} ] );
			props.onChange( next );
			setCollapsed( {} );
		}

		function removeItem( index ) {
			const next = items.filter( function ( _, i ) {
				return i !== index;
			} );
			props.onChange( next );
		}

		function updateItem( index, key, value ) {
			const next = items.map( function ( item, i ) {
				if ( i !== index ) {
					return item;
				}
				const updated = Object.assign( {}, item );
				updated[ key ] = value;
				return updated;
			} );
			props.onChange( next );
		}

		function moveItem( index, direction ) {
			const target = index + direction;
			if ( target < 0 || target >= items.length ) {
				return;
			}
			const next = items.slice();
			const temp = next[ index ];
			next[ index ] = next[ target ];
			next[ target ] = temp;
			props.onChange( next );
		}

		function toggleCollapse( index ) {
			setCollapsed( function ( prev ) {
				const next = Object.assign( {}, prev );
				next[ index ] = ! prev[ index ];
				return next;
			} );
		}

		function itemLabel( item, index ) {
			for ( let i = 0; i < fieldDefs.length; i++ ) {
				const def = fieldDefs[ i ];
				const val = item[ def.key ];
				if ( val && 'object' === typeof val ) {
					if ( val.url ) {
						return val.alt || 'Logo image';
					}
					continue;
				}
				if ( val && 'string' === typeof val && val.trim() ) {
					return val.trim();
				}
			}
			return 'Item ' + ( index + 1 );
		}

		const rows = items.map( function ( item, index ) {
			const isCollapsed = !! collapsed[ index ];
			const fields = fieldDefs.map( function ( def ) {
				if ( 'image' === def.type ) {
					const img = item[ def.key ] || {};
					return el(
						'div',
						{ key: def.key, className: 'nc-repeater-media-field' },
						el(
							'label',
							{ className: 'nc-repeater-media-label' },
							def.label
						),
						img.url
							? el( 'img', {
									src: img.url,
									alt: img.alt || '',
									className: 'nc-repeater-media-thumb',
							  } )
							: null,
						el(
							MediaUploadCheck,
							{},
							el( MediaUpload, {
								allowedTypes: [ 'image' ],
								value: img.id,
								onSelect( media ) {
									updateItem(
										index,
										def.key,
										mediaValue( media )
									);
								},
								render( state ) {
									return el(
										Button,
										{
											variant: 'secondary',
											isSmall: true,
											onClick: state.open,
										},
										img.url ? 'Replace' : 'Choose image'
									);
								},
							} )
						),
						img.url
							? el(
									Button,
									{
										key: 'remove-' + def.key,
										variant: 'tertiary',
										isSmall: true,
										isDestructive: true,
										onClick() {
											updateItem( index, def.key, {} );
										},
									},
									'Remove'
							  )
							: null
					);
				}
				if ( 'textarea' === def.type ) {
					return el( TextareaControl, {
						key: def.key,
						label: def.label,
						value: item[ def.key ] || '',
						rows: 3,
						onChange( value ) {
							updateItem( index, def.key, value );
						},
					} );
				}
				if ( 'select' === def.type ) {
					return el( SelectControl, {
						key: def.key,
						label: def.label,
						value:
							item[ def.key ] ||
							( def.options && def.options[ 0 ]
								? def.options[ 0 ].value
								: '' ),
						options: def.options || [],
						onChange( value ) {
							updateItem( index, def.key, value );
						},
					} );
				}
				if ( 'list' === def.type ) {
					const listValue = Array.isArray( item[ def.key ] )
						? item[ def.key ].join( ', ' )
						: item[ def.key ] || '';
					return el( TextControl, {
						key: def.key,
						label: def.label + ' (comma-separated)',
						value: listValue,
						onChange( value ) {
							const arr = value
								.split( ',' )
								.map( function ( s ) {
									return s.trim();
								} )
								.filter( Boolean );
							updateItem( index, def.key, arr.length ? arr : [] );
						},
					} );
				}
				return el( TextControl, {
					key: def.key,
					label: def.label,
					value: item[ def.key ] || '',
					onChange( value ) {
						updateItem( index, def.key, value );
					},
				} );
			} );

			return el(
				'div',
				{ key: index, className: 'nc-repeater-item' },
				el(
					'div',
					{
						className: 'nc-repeater-item-header',
						onClick() {
							toggleCollapse( index );
						},
					},
					el(
						'span',
						{ className: 'nc-repeater-item-number' },
						String( index + 1 )
					),
					el(
						'span',
						{ className: 'nc-repeater-item-label' },
						itemLabel( item, index )
					),
					el(
						'span',
						{
							className:
								'nc-repeater-item-toggle' +
								( isCollapsed
									? ' nc-repeater-item-toggle--collapsed'
									: '' ),
						},
						'\u25BC'
					)
				),
				isCollapsed
					? null
					: el(
							'div',
							{ className: 'nc-repeater-item-body' },
							el(
								'div',
								{ className: 'nc-repeater-item-fields' },
								fields
							),
							el(
								'div',
								{ className: 'nc-repeater-item-actions' },
								el(
									Button,
									{
										variant: 'tertiary',
										isSmall: true,
										onClick() {
											moveItem( index, -1 );
										},
										disabled: 0 === index,
									},
									'\u2191'
								),
								el(
									Button,
									{
										variant: 'tertiary',
										isSmall: true,
										onClick() {
											moveItem( index, 1 );
										},
										disabled: index === items.length - 1,
									},
									'\u2193'
								),
								el(
									Button,
									{
										variant: 'tertiary',
										isSmall: true,
										isDestructive: true,
										onClick() {
											removeItem( index );
										},
									},
									'Remove'
								)
							)
					  )
			);
		} );

		return el(
			'div',
			{ className: 'nc-repeater' },
			el(
				'div',
				{ className: 'nc-repeater-header' },
				el(
					'strong',
					{ className: 'nc-repeater-header-label' },
					props.label
				),
				el(
					'span',
					{ className: 'nc-repeater-count' },
					items.length + ' item' + ( 1 === items.length ? '' : 's' )
				)
			),
			el( 'div', { className: 'nc-repeater-items' }, rows ),
			el(
				Button,
				{
					variant: 'secondary',
					onClick: addItem,
					className: 'nc-repeater-add',
				},
				'+ Add item'
			)
		);
	}

	/* ---------------------------------------------------------------
	 * Per-block-type item field schemas
	 * --------------------------------------------------------------- */

	const itemFieldDefs = {
		features: [
			{ key: 'title', label: 'Title', type: 'text' },
			{ key: 'description', label: 'Description', type: 'textarea' },
			{ key: 'points', label: 'Points', type: 'list' },
			{ key: 'thumbnail', label: 'Thumbnail', type: 'image' },
		],
		statistics: [
			{ key: 'value', label: 'Value', type: 'text' },
			{ key: 'label', label: 'Label', type: 'text' },
		],
		testimonials: [
			{ key: 'quote', label: 'Quote', type: 'textarea' },
			{ key: 'author', label: 'Author', type: 'text' },
			{ key: 'avatar', label: 'Avatar', type: 'image' },
		],
		faq: [
			{ key: 'question', label: 'Question', type: 'text' },
			{ key: 'answer', label: 'Answer', type: 'textarea' },
		],
		'logo-grid': [
			{ key: 'name', label: 'Name', type: 'text' },
			{ key: 'image', label: 'Logo', type: 'image' },
		],
	};

	/* ---------------------------------------------------------------
	 * Content area builders – inline RichText editing
	 * --------------------------------------------------------------- */

	function buildHeading( attrs, set, placeholder ) {
		return el( RichText, {
			tagName: 'h2',
			className: 'nc-content-heading',
			value: attrs.heading,
			onChange( value ) {
				set( 'heading', value );
			},
			placeholder,
			allowedFormats: [ 'core/bold', 'core/italic', 'core/link' ],
		} );
	}

	function buildBody( attrs, set, placeholder ) {
		return el( RichText, {
			tagName: 'div',
			className: 'nc-content-body',
			value: attrs.body,
			onChange( value ) {
				set( 'body', value );
			},
			placeholder: placeholder || 'Write your content here...',
			allowedFormats: [
				'core/bold',
				'core/italic',
				'core/link',
				'core/list',
			],
		} );
	}

	function buildEyebrow( attrs, set ) {
		return el( RichText, {
			tagName: 'p',
			className: 'nc-content-eyebrow',
			value: attrs.eyebrow,
			onChange( value ) {
				set( 'eyebrow', value );
			},
			placeholder: 'Eyebrow',
			allowedFormats: [],
		} );
	}

	function buildItems( attrs, set, type ) {
		const defs = itemFieldDefs[ type ];
		if ( ! defs ) {
			return null;
		}
		return el( RepeatControl, {
			label: 'Items',
			value: attrs.items,
			fieldDefs: defs,
			onChange( value ) {
				set( 'items', value );
			},
		} );
	}

	const buttonFieldDefs = [
		{ key: 'label', label: 'Label', type: 'text' },
		{ key: 'url', label: 'URL', type: 'text' },
		{
			key: 'variant',
			label: 'Style',
			type: 'select',
			options: [
				{ label: 'Primary', value: 'primary' },
				{ label: 'Secondary', value: 'secondary' },
				{ label: 'Light', value: 'light' },
			],
		},
	];

	function buildButtons( attrs, set ) {
		return el( RepeatControl, {
			label: 'Buttons',
			value: attrs.buttons,
			fieldDefs: buttonFieldDefs,
			onChange( value ) {
				set( 'buttons', value );
			},
		} );
	}

	function contentHero( attrs, set ) {
		return el(
			'div',
			{ className: 'nc-content-row' },
			el(
				'div',
				{ className: 'nc-content-col nc-content-col--text' },
				buildEyebrow( attrs, set ),
				buildHeading( attrs, set, 'Hero heading' ),
				buildBody( attrs, set, 'Write a compelling introduction...' ),
				buildButtons( attrs, set )
			),
			el(
				'div',
				{ className: 'nc-content-col nc-content-col--media' },
				attrs.image && attrs.image.url
					? el( 'img', {
							src: attrs.image.url,
							alt: attrs.image.alt || '',
							className: 'nc-content-image',
					  } )
					: el(
							'div',
							{ className: 'nc-content-media-placeholder' },
							'Add image in sidebar'
					  )
			)
		);
	}

	function contentIntro( attrs, set ) {
		const imageRight = attrs.image_position !== 'left';
		const textCol = el(
			'div',
			{ className: 'nc-content-col nc-content-col--text' },
			buildEyebrow( attrs, set ),
			buildHeading( attrs, set, 'Introduction heading' ),
			buildBody( attrs, set, 'Write an introduction...' )
		);
		const mediaCol = el(
			'div',
			{ className: 'nc-content-col nc-content-col--media' },
			attrs.image && attrs.image.url
				? el( 'img', {
						src: attrs.image.url,
						alt: attrs.image.alt || '',
						className: 'nc-content-image',
				  } )
				: el(
						'div',
						{ className: 'nc-content-media-placeholder' },
						'Add image in sidebar'
				  )
		);
		return el(
			'div',
			{
				className:
					'nc-content-row' +
					( imageRight ? '' : ' nc-content-row--media-first' ),
			},
			imageRight
				? el( Fragment, {}, textCol, mediaCol )
				: el( Fragment, {}, mediaCol, textCol )
		);
	}

	function contentRichText( attrs, set ) {
		return el(
			'div',
			{ className: 'nc-content-stack' },
			buildHeading( attrs, set, 'Section heading' ),
			buildBody( attrs, set, 'Write your content...' )
		);
	}

	function contentImageText( attrs, set ) {
		const imageRight = attrs.image_position !== 'left';
		const textCol = el(
			'div',
			{ className: 'nc-content-col nc-content-col--text' },
			buildEyebrow( attrs, set ),
			buildHeading( attrs, set, 'Section heading' ),
			buildBody( attrs, set, 'Write your content...' ),
			buildButtons( attrs, set )
		);
		const mediaCol = el(
			'div',
			{ className: 'nc-content-col nc-content-col--media' },
			attrs.image && attrs.image.url
				? el( 'img', {
						src: attrs.image.url,
						alt: attrs.image.alt || '',
						className: 'nc-content-image',
				  } )
				: el(
						'div',
						{ className: 'nc-content-media-placeholder' },
						'Add image in sidebar'
				  )
		);
		return el(
			'div',
			{
				className:
					'nc-content-row' +
					( imageRight ? '' : ' nc-content-row--media-first' ),
			},
			imageRight
				? el( Fragment, {}, textCol, mediaCol )
				: el( Fragment, {}, mediaCol, textCol )
		);
	}

	function contentFeatures( attrs, set ) {
		return el(
			'div',
			{ className: 'nc-content-stack' },
			buildEyebrow( attrs, set ),
			buildHeading( attrs, set, 'Features heading' ),
			buildBody( attrs, set, 'Describe your features...' ),
			buildItems( attrs, set, 'features' )
		);
	}

	function contentStatistics( attrs, set ) {
		return el(
			'div',
			{ className: 'nc-content-stack' },
			buildEyebrow( attrs, set ),
			buildHeading( attrs, set, 'Statistics heading' ),
			buildItems( attrs, set, 'statistics' )
		);
	}

	function contentTestimonials( attrs, set ) {
		return el(
			'div',
			{ className: 'nc-content-stack' },
			buildEyebrow( attrs, set ),
			buildHeading( attrs, set, 'Testimonials' ),
			buildItems( attrs, set, 'testimonials' )
		);
	}

	function contentGallery( attrs, set ) {
		return el(
			'div',
			{ className: 'nc-content-stack' },
			buildEyebrow( attrs, set ),
			buildHeading( attrs, set, 'Gallery' )
		);
	}

	function contentCTA( attrs, set ) {
		return el(
			'div',
			{ className: 'nc-content-stack nc-content-stack--centered' },
			buildHeading( attrs, set, 'Call to action' ),
			buildBody( attrs, set, 'Write a persuasive message...' ),
			buildButtons( attrs, set )
		);
	}

	function contentFAQ( attrs, set ) {
		return el(
			'div',
			{ className: 'nc-content-stack' },
			buildEyebrow( attrs, set ),
			buildHeading( attrs, set, 'FAQ' ),
			buildItems( attrs, set, 'faq' )
		);
	}

	function contentLogoGrid( attrs, set ) {
		return el(
			'div',
			{ className: 'nc-content-stack' },
			buildEyebrow( attrs, set ),
			buildHeading( attrs, set, 'Logo grid' ),
			buildItems( attrs, set, 'logo-grid' )
		);
	}

	function contentFormEmbed( attrs, set ) {
		return el(
			'div',
			{ className: 'nc-content-stack' },
			buildHeading( attrs, set, 'Form section' ),
			el(
				'div',
				{ className: 'nc-content-form-info' },
				el(
					'span',
					{ className: 'nc-content-form-info-icon' },
					'\u2709'
				),
				el(
					'span',
					{},
					attrs.provider
						? attrs.provider + ' form embed'
						: 'Configure form embed in sidebar'
				)
			)
		);
	}

	const contentBuilders = {
		hero: contentHero,
		intro: contentIntro,
		'rich-text': contentRichText,
		'image-text': contentImageText,
		features: contentFeatures,
		statistics: contentStatistics,
		testimonials: contentTestimonials,
		gallery: contentGallery,
		cta: contentCTA,
		faq: contentFAQ,
		'logo-grid': contentLogoGrid,
		'form-embed': contentFormEmbed,
	};

	/* ---------------------------------------------------------------
	 * Main edit component
	 * --------------------------------------------------------------- */

	function Edit( props, type, fields ) {
		const values = props.attributes;
		const initialized = useRef( false );
		const generatedSectionId = useRef(
			values.section_id && values.section_id === slugify( values.heading )
				? values.section_id
				: ''
		);
		const blockProps = useBlockProps( {
			className: values.preview
				? 'nc-block-preview'
				: 'nexuscontent-editor-content',
		} );

		function set( key, value ) {
			const update = {};
			update[ key ] = value;
			props.setAttributes( update );
		}

		/* Keep following the heading until an editor supplies a custom ID. */
		/* eslint-disable react-hooks/exhaustive-deps */
		useEffect(
			function () {
				if ( values.preview ) {
					return;
				}
				const slug = slugify( values.heading );
				if (
					slug &&
					( ! values.section_id ||
						values.section_id === generatedSectionId.current ) &&
					slug !== values.section_id
				) {
					generatedSectionId.current = slug;
					set( 'section_id', slug );
				}
			},
			[ values.heading ]
		);
		/* eslint-enable react-hooks/exhaustive-deps */

		/* Set sensible defaults on first render. */
		/* eslint-disable react-hooks/exhaustive-deps */
		useEffect(
			function () {
				if ( values.preview || initialized.current ) {
					return;
				}
				initialized.current = true;

				const defaults = {
					hero: {
						heading: 'Welcome',
						body: 'Write a compelling introduction here.',
						eyebrow: '',
					},
					intro: {
						heading: 'About Us',
						body: 'Write an introduction about your company.',
						eyebrow: '',
					},
					'rich-text': {
						heading: 'Section Heading',
						body: 'Write your content here.',
					},
					'image-text': {
						heading: 'Image and Text',
						body: 'Describe this section.',
						eyebrow: '',
					},
					features: {
						heading: 'Features',
						body: 'Describe what you offer.',
						eyebrow: '',
						items: [
							{
								title: 'Feature One',
								description: 'Description of this feature.',
							},
							{
								title: 'Feature Two',
								description: 'Description of this feature.',
							},
							{
								title: 'Feature Three',
								description: 'Description of this feature.',
							},
						],
					},
					statistics: {
						heading: 'Key Numbers',
						eyebrow: '',
						items: [
							{ value: '100+', label: 'Metric' },
							{ value: '50+', label: 'Metric' },
							{ value: '10+', label: 'Metric' },
						],
					},
					testimonials: {
						heading: 'What People Say',
						eyebrow: '',
						items: [
							{
								quote: 'A great testimonial from a happy client.',
								author: 'Client Name',
							},
							{
								quote: 'Another wonderful testimonial.',
								author: 'Client Name',
							},
						],
					},
					gallery: {
						heading: 'Gallery',
						eyebrow: '',
					},
					cta: {
						heading: 'Get Started',
						body: 'Take the next step today.',
					},
					faq: {
						heading: 'Frequently Asked Questions',
						eyebrow: '',
						items: [
							{
								question: 'What is this?',
								answer: 'This is a frequently asked question.',
							},
							{
								question: 'How does it work?',
								answer: 'It works by doing great things.',
							},
						],
					},
					'logo-grid': {
						heading: 'Our Partners',
						eyebrow: '',
						items: [
							{ label: 'Partner 1' },
							{ label: 'Partner 2' },
							{ label: 'Partner 3' },
						],
					},
					'form-embed': {
						heading: 'Contact Us',
					},
				};

				const d = defaults[ type ];
				if ( ! d ) {
					return;
				}

				const attrs = {};
				Object.keys( d ).forEach( function ( key ) {
					if (
						! values[ key ] ||
						( 'string' === typeof values[ key ] &&
							'' === values[ key ] )
					) {
						attrs[ key ] = d[ key ];
					}
				} );
				if ( Object.keys( attrs ).length > 0 ) {
					props.setAttributes( attrs );
				}
			},
			/* Run once on mount. */
			[]
		);
		/* eslint-enable react-hooks/exhaustive-deps */

		if ( values.preview ) {
			return el( 'div', blockProps, el( PreviewImage, { type } ) );
		}

		/* Sidebar controls – media, secondary fields, and section settings. */
		const controls = [];
		const settingsControls = [];
		fields.forEach( function ( field ) {
			if ( sidebarHiddenFields.indexOf( field ) !== -1 ) {
				return;
			}
			const fieldControls =
				settingsFields.indexOf( field ) !== -1
					? settingsControls
					: controls;
			if ( mediaFields.indexOf( field ) !== -1 ) {
				fieldControls.push(
					el( MediaControl, {
						key: field,
						value: values[ field ],
						onChange( value ) {
							set( field, value );
						},
					} )
				);
				return;
			}
			if ( 'images' === field ) {
				fieldControls.push(
					el( GalleryControl, {
						key: field,
						value: values[ field ],
						onChange( value ) {
							set( field, value );
						},
					} )
				);
				return;
			}
			if ( 'image_position' === field ) {
				fieldControls.push(
					el( SelectControl, {
						key: field,
						label: 'Image position',
						value: values[ field ],
						options: [
							{ label: 'Left', value: 'left' },
							{ label: 'Right', value: 'right' },
						],
						onChange( value ) {
							set( field, value );
						},
					} )
				);
				return;
			}
			if ( 'provider' === field ) {
				fieldControls.push(
					el( SelectControl, {
						key: field,
						label: 'Form provider',
						value: values[ field ] || '',
						options: [
							{ label: 'Select a provider', value: '' },
							{ label: 'HubSpot', value: 'hubspot' },
							{ label: 'Mailchimp', value: 'mailchimp' },
							{ label: 'Typeform', value: 'typeform' },
							{ label: 'Google Forms', value: 'google-forms' },
							{ label: 'Jotform', value: 'jotform' },
							{ label: 'Other', value: 'other' },
						],
						onChange( value ) {
							set( field, value );
						},
					} )
				);
				return;
			}
			if ( 'embed_code' === field ) {
				fieldControls.push(
					el( TextareaControl, {
						key: field,
						label: 'Embed code',
						help: 'Paste your form embed code or script tag.',
						value: values[ field ] || '',
						rows: 6,
						onChange( value ) {
							set( field, value );
						},
					} )
				);
				return;
			}
			const labels = {
				section_id: 'Section ID',
				variant: 'Variant',
				theme: 'Theme',
			};
			const label = labels[ field ] || field.replace( /_/g, ' ' );
			fieldControls.push(
				el( TextControl, {
					key: field,
					label,
					help:
						'section_id' === field
							? 'Generated from the heading until you enter a custom value.'
							: undefined,
					type: /_url$/.test( field ) ? 'url' : 'text',
					value: values[ field ] || '',
					onChange( value ) {
						if ( 'section_id' === field ) {
							const customId = slugify( value );
							if ( customId ) {
								generatedSectionId.current = '';
								set( field, customId );
								return;
							}
							const generated = slugify( values.heading );
							generatedSectionId.current = generated;
							set( field, generated );
							return;
						}
						set( field, value );
					},
				} )
			);
		} );

		/* Content area – inline RichText editing. */
		const builder = contentBuilders[ type ];
		const contentArea = builder
			? builder( values, set )
			: el(
					'div',
					{ className: 'nc-content-stack' },
					buildHeading( values, set, titles[ type ] )
			  );

		return el(
			Fragment,
			{},
			el(
				InspectorControls,
				{},
				el(
					PanelBody,
					{ title: 'Section settings', initialOpen: true },
					controls,
					settingsControls.length
						? el( 'div', { className: 'nc-settings-separator' } )
						: null,
					...settingsControls
				),
				el(
					PanelBody,
					{ title: 'Block preview', initialOpen: false },
					el( PreviewImage, { type } )
				)
			),
			el( 'div', blockProps, contentArea )
		);
	}

	/* ---------------------------------------------------------------
	 * Block registration
	 * --------------------------------------------------------------- */

	Object.keys( definitions ).forEach( function ( type ) {
		const canonicalType = type.replace( /-/g, '_' );
		if ( ! settings.nativeTypes.includes( canonicalType ) ) {
			return;
		}
		const fields = definitions[ type ];
		wp.blocks.registerBlockType( 'nexuscontent/' + type, {
			title: titles[ type ],
			category: 'nexuscontent',
			attributes: attributesFor( fields ),
			example: { attributes: { preview: true } },
			supports: { anchor: true, html: false },
			edit( props ) {
				return Edit( props, type, fields );
			},
			save() {
				return null;
			},
		} );
	} );

	// Unregister blocks that are disabled in settings.
	if ( Array.isArray( settings.enabledSections ) ) {
		Object.keys( definitions ).forEach( function ( type ) {
			const canonicalType = type.replace( /-/g, '_' );
			if ( ! settings.enabledSections.includes( canonicalType ) ) {
				wp.blocks.unregisterBlockType( 'nexuscontent/' + type );
			}
		} );
	}
} )( window.wp, window.NexusContentEditorSettings );

( function ( wp, settings ) {
	'use strict';
	if (
		! wp ||
		! settings ||
		! wp.plugins ||
		! wp.editPost ||
		! wp.data ||
		! wp.components ||
		! wp.element
	) {
		return;
	}
	const el = wp.element.createElement;
	function EditorModePanel() {
		const meta = wp.data.useSelect( function ( select ) {
			return (
				select( 'core/editor' ).getEditedPostAttribute( 'meta' ) || {}
			);
		}, [] );
		const blockCount = wp.data.useSelect( function ( select ) {
			const editor = select( 'core/block-editor' );
			return editor && editor.getBlockCount ? editor.getBlockCount() : 0;
		}, [] );
		const editPost = wp.data.useDispatch( 'core/editor' ).editPost;
		const current = meta[ settings.metaKey ] || 'gutenberg';
		function change( next ) {
			if ( next === current ) {
				return;
			}
			if (
				( ( 'gutenberg' === current && blockCount > 0 ) ||
					( settings.contentByMode &&
						settings.contentByMode[ current ] ) ) &&
				// A synchronous confirmation prevents changing persisted meta before consent.
				// eslint-disable-next-line no-alert
				! window.confirm( settings.labels.warning )
			) {
				return;
			}
			const nextMeta = Object.assign( {}, meta );
			nextMeta[ settings.metaKey ] = next;
			editPost( { meta: nextMeta } );
		}
		return el(
			wp.editPost.PluginDocumentSettingPanel,
			{ name: 'nexuscontent-editor-mode', title: settings.labels.panel },
			el( 'p', {}, settings.labels.description ),
			el( wp.components.RadioControl, {
				label: 'Editor mode',
				selected: current,
				options: settings.modes.map( function ( mode ) {
					return {
						label: mode.label,
						value: mode.value,
						disabled: ! mode.available,
					};
				} ),
				onChange: change,
			} )
		);
	}
	wp.plugins.registerPlugin( 'nexuscontent-editor-settings', {
		render: EditorModePanel,
		icon: 'layout',
	} );
} )( window.wp, window.NexusContentEditorSettings );
