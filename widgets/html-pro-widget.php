<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Momentum_HTML_Pro_Widget extends \Elementor\Widget_Base {

    public function get_name() {
        return 'momentum_html_pro';
    }

    public function get_title() {
        return esc_html__( 'Momentum Pro Editor', 'momentum-pro-editor' );
    }

    public function get_icon() {
        return 'eicon-code';
    }

    public function get_categories() {
        return [ 'momentum-pro' ];

    }

    public function get_keywords() {
        return [ 'html', 'code', 'momentum', 'pro', 'editor', 'custom' ];
    }

    /**
     * Register custom widget category
     */
    public function __construct( $data = [], $args = null ) {
        parent::__construct( $data, $args );

        add_action( 'elementor/elements/categories_registered', function( $elements_manager ) {
            $elements_manager->add_category( 'momentum-pro', [
                'title' => esc_html__( 'Momentum Pro', 'momentum-pro-editor' ),
                'icon'  => 'fa fa-code',
            ] );
        } );
    }

    protected function register_controls() {

        // ============================================
        // TAB 1: HTML CODE INPUT
        // ============================================
        $this->start_controls_section(
            'section_html_code',
            [
                'label' => esc_html__( '📌 كود HTML', 'momentum-pro-editor' ),
                'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );

        $this->add_control(
            'html_code',
            [
                'label'       => esc_html__( 'ادخل كود HTML هنا', 'momentum-pro-editor' ),
                'type'        => \Elementor\Controls_Manager::CODE,
                'language'    => 'html',
                'rows'        => 20,
                'default'     => '<div class="momentum-demo">
    <h1>مرحباً بيك في Momentum Pro Editor</h1>
    <p>ده النص التجريبي - اضغط حلل الكود عشان تقدر تعدل من هنا</p>
    <img src="https://via.placeholder.com/600x300" alt="صورة تجريبية" width="600" height="300">
</div>',
                'description' => esc_html__( 'حط كود HTML هنا وبعدين روح لتاب "التعديلات" عشان تعدل المحتوى بسهولة', 'momentum-pro-editor' ),
            ]
        );

        $this->add_control(
            'parse_notice',
            [
                'type'            => \Elementor\Controls_Manager::RAW_HTML,
                'raw'             => '<button class="elementor-button elementor-button-success momentum-parse-btn" onclick="momentumParseHTML(this)" style="background:#28a745;color:#fff;padding:8px 20px;border:none;border-radius:5px;cursor:pointer;font-size:14px;width:100%;margin-top:10px;">🔄 حلّل الكود وأنشئ التعديلات</button>',
                'content_classes' => 'momentum-parse-notice',
            ]
        );

        $this->end_controls_section();

        // ============================================
        // TAB 2: TEXT ELEMENTS
        // ============================================
        $this->start_controls_section(
            'section_text_elements',
            [
                'label' => esc_html__( '📝 النصوص', 'momentum-pro-editor' ),
                'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );

        // Dynamic text fields (up to 20 text elements)
        for ( $i = 1; $i <= 20; $i++ ) {
            $this->add_control(
                'text_heading_' . $i,
                [
                    'label'     => esc_html__( 'عنصر نص ', 'momentum-pro-editor' ) . $i,
                    'type'      => \Elementor\Controls_Manager::HEADING,
                    'separator' => 'before',
                    'classes'   => 'momentum-text-heading',
                    'condition' => [
                        'text_element_tag_' . $i . '!' => '',
                    ],
                ]
            );

            $this->add_control(
                'text_element_tag_' . $i,
                [
                    'label'   => esc_html__( 'نوع العنصر', 'momentum-pro-editor' ),
                    'type'    => \Elementor\Controls_Manager::HIDDEN,
                    'default' => '',
                ]
            );

            $this->add_control(
                'text_element_index_' . $i,
                [
                    'label'   => esc_html__( 'ترتيب العنصر', 'momentum-pro-editor' ),
                    'type'    => \Elementor\Controls_Manager::HIDDEN,
                    'default' => '',
                ]
            );

            $this->add_control(
                'text_content_' . $i,
                [
                    'label'       => esc_html__( 'النص', 'momentum-pro-editor' ),
                    'type'        => \Elementor\Controls_Manager::TEXTAREA,
                    'default'     => '',
                    'placeholder' => esc_html__( 'النص هنا...', 'momentum-pro-editor' ),
                    'condition'   => [
                        'text_element_tag_' . $i . '!' => '',
                    ],
                ]
            );

            $this->add_control(
                'text_color_' . $i,
                [
                    'label'     => esc_html__( 'اللون', 'momentum-pro-editor' ),
                    'type'      => \Elementor\Controls_Manager::COLOR,
                    'default'   => '',
                    'condition' => [
                        'text_element_tag_' . $i . '!' => '',
                    ],
                ]
            );

            $this->add_control(
                'text_size_' . $i,
                [
                    'label'      => esc_html__( 'حجم الخط', 'momentum-pro-editor' ),
                    'type'       => \Elementor\Controls_Manager::SLIDER,
                    'size_units' => [ 'px', 'em', 'rem' ],
                    'range'      => [
                        'px' => [
                            'min' => 8,
                            'max' => 120,
                        ],
                    ],
                    'condition'  => [
                        'text_element_tag_' . $i . '!' => '',
                    ],
                ]
            );
        }

        $this->add_control(
            'no_text_notice',
            [
                'type'            => \Elementor\Controls_Manager::RAW_HTML,
                'raw'             => '<p style="color:#999;text-align:center;padding:20px;">⬆️ روح لتاب "كود HTML" واضغط "حلّل الكود" الأول</p>',
                'content_classes' => 'momentum-no-text-notice',
            ]
        );

        $this->end_controls_section();

        // ============================================
        // TAB 3: IMAGE ELEMENTS
        // ============================================
        $this->start_controls_section(
            'section_image_elements',
            [
                'label' => esc_html__( '🖼️ الصور', 'momentum-pro-editor' ),
                'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );

        // Dynamic image fields (up to 10 images)
        for ( $i = 1; $i <= 10; $i++ ) {
            $this->add_control(
                'img_heading_' . $i,
                [
                    'label'     => esc_html__( 'صورة ', 'momentum-pro-editor' ) . $i,
                    'type'      => \Elementor\Controls_Manager::HEADING,
                    'separator' => 'before',
                    'condition' => [
                        'img_element_src_' . $i . '!' => '',
                    ],
                ]
            );

            $this->add_control(
                'img_element_src_' . $i,
                [
                    'label'   => esc_html__( 'رابط الصورة الأصلي', 'momentum-pro-editor' ),
                    'type'    => \Elementor\Controls_Manager::HIDDEN,
                    'default' => '',
                ]
            );

            $this->add_control(
                'img_element_index_' . $i,
                [
                    'label'   => esc_html__( 'ترتيب الصورة', 'momentum-pro-editor' ),
                    'type'    => \Elementor\Controls_Manager::HIDDEN,
                    'default' => '',
                ]
            );

            $this->add_control(
                'img_new_image_' . $i,
                [
                    'label'     => esc_html__( 'اختر صورة جديدة', 'momentum-pro-editor' ),
                    'type'      => \Elementor\Controls_Manager::MEDIA,
                    'default'   => [
                        'url' => '',
                    ],
                    'condition' => [
                        'img_element_src_' . $i . '!' => '',
                    ],
                ]
            );

            $this->add_control(
                'img_width_' . $i,
                [
                    'label'      => esc_html__( 'العرض', 'momentum-pro-editor' ),
                    'type'       => \Elementor\Controls_Manager::SLIDER,
                    'size_units' => [ 'px', '%' ],
                    'range'      => [
                        'px' => [
                            'min' => 10,
                            'max' => 2000,
                        ],
                        '%'  => [
                            'min' => 1,
                            'max' => 100,
                        ],
                    ],
                    'condition'  => [
                        'img_element_src_' . $i . '!' => '',
                    ],
                ]
            );

            $this->add_control(
                'img_height_' . $i,
                [
                    'label'      => esc_html__( 'الطول', 'momentum-pro-editor' ),
                    'type'       => \Elementor\Controls_Manager::SLIDER,
                    'size_units' => [ 'px', '%' ],
                    'range'      => [
                        'px' => [
                            'min' => 10,
                            'max' => 2000,
                        ],
                        '%'  => [
                            'min' => 1,
                            'max' => 100,
                        ],
                    ],
                    'condition'  => [
                        'img_element_src_' . $i . '!' => '',
                    ],
                ]
            );

            $this->add_control(
                'img_border_radius_' . $i,
                [
                    'label'      => esc_html__( 'حواف دائرية', 'momentum-pro-editor' ),
                    'type'       => \Elementor\Controls_Manager::SLIDER,
                    'size_units' => [ 'px', '%' ],
                    'range'      => [
                        'px' => [
                            'min' => 0,
                            'max' => 200,
                        ],
                    ],
                    'condition'  => [
                        'img_element_src_' . $i . '!' => '',
                    ],
                ]
            );
        }

        $this->add_control(
            'no_img_notice',
            [
                'type'            => \Elementor\Controls_Manager::RAW_HTML,
                'raw'             => '<p style="color:#999;text-align:center;padding:20px;">⬆️ روح لتاب "كود HTML" واضغط "حلّل الكود" الأول</p>',
                'content_classes' => 'momentum-no-img-notice',
            ]
        );

        $this->end_controls_section();

        // ============================================
        // TAB 4: SPACING & LAYOUT
        // ============================================
        $this->start_controls_section(
            'section_spacing',
            [
                'label' => esc_html__( '📏 المسافات', 'momentum-pro-editor' ),
                'tab'   => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );

        $this->add_control(
            'container_padding',
            [
                'label'      => esc_html__( 'Padding الحاوية', 'momentum-pro-editor' ),
                'type'       => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => [ 'px', '%', 'em' ],
                'selectors'  => [
                    '{{WRAPPER}} .momentum-html-output' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->add_control(
            'container_margin',
            [
                'label'      => esc_html__( 'Margin الحاوية', 'momentum-pro-editor' ),
                'type'       => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => [ 'px', '%', 'em' ],
                'selectors'  => [
                    '{{WRAPPER}} .momentum-html-output' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->add_control(
            'container_bg_color',
            [
                'label'     => esc_html__( 'لون خلفية الحاوية', 'momentum-pro-editor' ),
                'type'      => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .momentum-html-output' => 'background-color: {{VALUE}};',
                ],
            ]
        );

        $this->add_control(
            'container_border_radius',
            [
                'label'      => esc_html__( 'حواف دائرية للحاوية', 'momentum-pro-editor' ),
                'type'       => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => [ 'px', '%' ],
                'selectors'  => [
                    '{{WRAPPER}} .momentum-html-output' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->end_controls_section();

        // ============================================
        // TAB 5: CUSTOM CSS
        // ============================================
        $this->start_controls_section(
            'section_custom_css',
            [
                'label' => esc_html__( '🎨 CSS إضافي', 'momentum-pro-editor' ),
                'tab'   => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );

        $this->add_control(
            'custom_css',
            [
                'label'       => esc_html__( 'كود CSS إضافي', 'momentum-pro-editor' ),
                'type'        => \Elementor\Controls_Manager::CODE,
                'language'    => 'css',
                'rows'        => 10,
                'default'     => '',
                'description' => esc_html__( 'أضف CSS مخصص هنا. استخدم selector عشان تستهدف العناصر جوا الويدجت.', 'momentum-pro-editor' ),
            ]
        );

        $this->end_controls_section();
    }

    protected function render() {
        $settings  = $this->get_settings_for_display();
        $html_code = $settings['html_code'];

        if ( empty( $html_code ) ) {
            return;
        }

        // Apply text modifications
        $dom = new \DOMDocument();
        libxml_use_internal_errors( true );
        $dom->loadHTML( '<?xml encoding="UTF-8">' . '<div id="momentum-temp-wrapper">' . $html_code . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEDEFAULT );
        libxml_clear_errors();

        $xpath = new \DOMXPath( $dom );

        // Process text elements
        $text_tags    = [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'li', 'td', 'th', 'label', 'button', 'strong', 'em', 'b', 'i', 'small', 'blockquote' ];
        $text_counter = 0;

        foreach ( $text_tags as $tag ) {
            $elements = $xpath->query( '//' . $tag );
            foreach ( $elements as $element ) {
                $text_counter++;
                if ( $text_counter > 20 ) break 2;

                $idx = $text_counter;

                // Update text content
                $new_text = $settings[ 'text_content_' . $idx ] ?? '';
                if ( ! empty( $new_text ) ) {
                    // Only update direct text, preserve child elements
                    $has_children = false;
                    foreach ( $element->childNodes as $child ) {
                        if ( $child->nodeType === XML_ELEMENT_NODE ) {
                            $has_children = true;
                            break;
                        }
                    }
                    if ( ! $has_children ) {
                        $element->nodeValue = $new_text;
                    } else {
                        // Update only first text node
                        foreach ( $element->childNodes as $child ) {
                            if ( $child->nodeType === XML_TEXT_NODE && trim( $child->nodeValue ) !== '' ) {
                                $child->nodeValue = $new_text;
                                break;
                            }
                        }
                    }
                }

                // Apply color
                $color = $settings[ 'text_color_' . $idx ] ?? '';
                if ( ! empty( $color ) ) {
                    $existing_style = $element->getAttribute( 'style' );
                    $element->setAttribute( 'style', $existing_style . ';color:' . $color );
                }

                // Apply font size
                $size = $settings[ 'text_size_' . $idx ] ?? '';
                if ( ! empty( $size ) && isset( $size['size'] ) && $size['size'] !== '' ) {
                    $unit          = $size['unit'] ?? 'px';
                    $existing_style = $element->getAttribute( 'style' );
                    $element->setAttribute( 'style', $existing_style . ';font-size:' . $size['size'] . $unit );
                }
            }
        }

        // Process image elements
        $images    = $xpath->query( '//img' );
        $img_counter = 0;

        foreach ( $images as $img ) {
            $img_counter++;
            if ( $img_counter > 10 ) break;

            $idx = $img_counter;

            // Update image source
            $new_image = $settings[ 'img_new_image_' . $idx ] ?? '';
            if ( ! empty( $new_image ) && ! empty( $new_image['url'] ) ) {
                $img->setAttribute( 'src', $new_image['url'] );
            }

            // Apply width
            $width = $settings[ 'img_width_' . $idx ] ?? '';
            if ( ! empty( $width ) && isset( $width['size'] ) && $width['size'] !== '' ) {
                $unit = $width['unit'] ?? 'px';
                if ( $unit === 'px' ) {
                    $img->setAttribute( 'width', $width['size'] );
                }
                $existing_style = $img->getAttribute( 'style' );
                $img->setAttribute( 'style', $existing_style . ';width:' . $width['size'] . $unit );
            }

            // Apply height
            $height = $settings[ 'img_height_' . $idx ] ?? '';
            if ( ! empty( $height ) && isset( $height['size'] ) && $height['size'] !== '' ) {
                $unit = $height['unit'] ?? 'px';
                if ( $unit === 'px' ) {
                    $img->setAttribute( 'height', $height['size'] );
                }
                $existing_style = $img->getAttribute( 'style' );
                $img->setAttribute( 'style', $existing_style . ';height:' . $height['size'] . $unit );
            }

            // Apply border radius
            $radius = $settings[ 'img_border_radius_' . $idx ] ?? '';
            if ( ! empty( $radius ) && isset( $radius['size'] ) && $radius['size'] !== '' ) {
                $unit           = $radius['unit'] ?? 'px';
                $existing_style = $img->getAttribute( 'style' );
                $img->setAttribute( 'style', $existing_style . ';border-radius:' . $radius['size'] . $unit );
            }
        }

        // Get the modified HTML
        $wrapper = $dom->getElementById( 'momentum-temp-wrapper' );
        $output  = '';
        if ( $wrapper ) {
            foreach ( $wrapper->childNodes as $child ) {
                $output .= $dom->saveHTML( $child );
            }
        }

        // Custom CSS
        $custom_css = $settings['custom_css'] ?? '';

        echo '<div class="momentum-html-output">';
        if ( ! empty( $custom_css ) ) {
            echo '<style>' . $custom_css . '</style>';
        }
        echo $output;
        echo '</div>';
    }

    protected function content_template() {
        ?>
        <div class="momentum-html-output">
            <# if ( settings.custom_css ) { #>
                <style>{{{ settings.custom_css }}}</style>
            <# } #>
            {{{ settings.html_code }}}
        </div>
        <?php
    }
}
