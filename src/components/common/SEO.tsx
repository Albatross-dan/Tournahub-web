import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: string;
  schemaData?: Record<string, any>;
}

export default function SEO({
  title,
  description,
  path,
  image = 'https://tournahub.me/android-chrome-512x512.png',
  type = 'website',
  schemaData
}: SEOProps) {
  const location = useLocation();
  const currentPath = path || location.pathname;
  const canonicalUrl = `https://tournahub.me${currentPath}`;
  
  const cleanTitle = title.includes('Tournahub') ? title : `${title} | Tournahub`;
  const defaultDesc = 'Create and manage football and eFootball tournaments with fixtures, standings, knockout brackets, leagues, and competitions on Tournahub.';
  const finalDesc = description || defaultDesc;

  useEffect(() => {
    // 1. Dynamic document title
    document.title = cleanTitle;

    // 2. Helper to set/update meta tags
    const setMetaTag = (attrName: 'name' | 'property', attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Update Standard Meta Tags
    setMetaTag('name', 'description', finalDesc);

    // 4. Update Open Graph Tags
    setMetaTag('property', 'og:title', cleanTitle);
    setMetaTag('property', 'og:description', finalDesc);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:image', image);

    // 5. Update Twitter Card Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', cleanTitle);
    setMetaTag('name', 'twitter:description', finalDesc);
    setMetaTag('name', 'twitter:image', image);

    // 6. Update Canonical Link tag
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // 7. Handle dynamic JSON-LD Schema injection for this page
    const existingScript = document.getElementById('dynamic-page-schema');
    if (existingScript) {
      existingScript.remove();
    }

    if (schemaData) {
      const script = document.createElement('script');
      script.id = 'dynamic-page-schema';
      script.type = 'application/ld+json';
      script.innerHTML = JSON.stringify(schemaData);
      document.head.appendChild(script);
    }

    return () => {
      // Cleanup custom schema wrapper on unmount
      const schemaScript = document.getElementById('dynamic-page-schema');
      if (schemaScript) {
        schemaScript.remove();
      }
    };
  }, [cleanTitle, finalDesc, type, canonicalUrl, image, schemaData]);

  // Visual helper returns null because it works through head-level DOM updates
  return null;
}
