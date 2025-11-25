import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * SEO Component - Manages page-specific meta tags and structured data
 * Usage: <SEO title="Page Title" description="Page description" />
 */
function SEO({ title, description, type = 'website', schema = null }) {
  const location = useLocation();
  const baseUrl = 'https://balkanbarber.com';
  const fullUrl = `${baseUrl}${location.pathname}`;

  useEffect(() => {
    // Update page title
    if (title) {
      document.title = `${title} | Balkan Barber`;
    }

    // Update meta description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      }
    }

    // Update Open Graph tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && title) {
      ogTitle.setAttribute('content', title);
    }

    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription && description) {
      ogDescription.setAttribute('content', description);
    }

    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', fullUrl);
    }

    let ogType = document.querySelector('meta[property="og:type"]');
    if (ogType) {
      ogType.setAttribute('content', type);
    }

    // Update Twitter tags
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle && title) {
      twitterTitle.setAttribute('content', title);
    }

    let twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription && description) {
      twitterDescription.setAttribute('content', description);
    }

    // Add/Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', fullUrl);
    } else {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', fullUrl);
      document.head.appendChild(canonical);
    }

    // Add/Update structured data (Schema.org JSON-LD)
    if (schema) {
      let scriptTag = document.getElementById('structured-data');
      if (scriptTag) {
        scriptTag.textContent = JSON.stringify(schema);
      } else {
        scriptTag = document.createElement('script');
        scriptTag.id = 'structured-data';
        scriptTag.type = 'application/ld+json';
        scriptTag.textContent = JSON.stringify(schema);
        document.head.appendChild(scriptTag);
      }
    }

    // Cleanup function
    return () => {
      // Reset to default title if component unmounts
      document.title = 'Balkan Barber - Downtown Jersey City Barbershop | Book Online';
    };
  }, [title, description, type, fullUrl, schema]);

  return null; // This component doesn't render anything
}

/**
 * Get LocalBusiness Schema for homepage
 */
export const getLocalBusinessSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://balkanbarber.com/#business',
  name: 'Balkan Barber',
  alternateName: 'Balkan Barbers',
  description: 'Premium barbershop in Downtown Jersey City specializing in scissors-focused cuts, straight edge razor shaves, and personalized grooming services.',
  url: 'https://balkanbarber.com',
  telephone: '+15551234567',
  email: 'info@balkanbarbers.com',
  priceRange: '$$',
  image: 'https://balkanbarber.com/og-image.jpg',
  logo: {
    '@type': 'ImageObject',
    url: 'https://balkanbarber.com/logo.png',
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: '332 Barrow St',
    addressLocality: 'Jersey City',
    addressRegion: 'NJ',
    postalCode: '07302',
    addressCountry: 'US',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 40.7165,
    longitude: -74.0433,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '10:00',
      closes: '19:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Saturday',
      opens: '10:00',
      closes: '18:00',
    },
  ],
  sameAs: [
    'https://www.facebook.com/balkanbarber',
    'https://www.instagram.com/balkanbarber',
    'https://www.google.com/maps/place/Balkan+Barber',
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '127',
  },
  paymentAccepted: 'Cash, Credit Card, Debit Card',
  currenciesAccepted: 'USD',
  amenityFeature: [
    {
      '@type': 'LocationFeatureSpecification',
      name: 'Online Booking',
      value: true,
    },
    {
      '@type': 'LocationFeatureSpecification',
      name: 'Walk-ins Welcome',
      value: true,
    },
  ],
});

/**
 * Get Service Schema for services page
 */
export const getServiceSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': 'https://balkanbarber.com/#services',
  serviceType: 'Barbershop Services',
  provider: {
    '@type': 'LocalBusiness',
    name: 'Balkan Barber',
    url: 'https://balkanbarber.com',
  },
  areaServed: {
    '@type': 'City',
    name: 'Jersey City',
  },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Barbershop Services',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Premium Haircut',
          description: 'Professional haircut with consultation, scissors-focused technique, and styling',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Hot Towel Shave',
          description: 'Traditional straight edge razor shave with hot towel treatment',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Beard Trim',
          description: 'Professional beard trimming and shaping',
        },
      },
    ],
  },
});

/**
 * Get WebSite Schema
 */
export const getWebsiteSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://balkanbarber.com/#website',
  url: 'https://balkanbarber.com',
  name: 'Balkan Barber',
  description: 'Premium barbershop in Downtown Jersey City offering professional haircuts, hot towel shaves, and grooming services.',
  publisher: {
    '@type': 'Organization',
    name: 'Balkan Barber',
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://balkanbarber.com/booking?search={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
});

export default SEO;
