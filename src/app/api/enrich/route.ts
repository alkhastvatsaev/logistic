import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Referer': 'https://www.google.com/'
      },
      next: { revalidate: 0 }
    });

    let title = "";
    let imageUrl = "";
    let description = "";

    if (response.ok) {
      const html = await response.text();
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const ogImageMatch = html.match(/<meta property="og:image" content="(.*?)"/i);
      const ogDescMatch = html.match(/<meta property="og:description" content="(.*?)"/i);

      title = titleMatch ? titleMatch[1].split(' - ')[0].replace('Cartier® FR', '').trim() : '';
      imageUrl = ogImageMatch ? ogImageMatch[1] : '';
      description = ogDescMatch ? ogDescMatch[1].replace(/<br>/g, '\n').replace(/&bull;/g, '•') : '';
    }

    // Hybrid Fallback from URL Slug
    if (!title) {
        const parts = url.split('/');
        const lastPart = parts.pop() || parts.pop(); // Handle trailing slash
        if (lastPart) {
           title = lastPart
             .split('?')[0]
             .replace('.html', '')
             .replace(/[A-Z0-9]{6,}/g, '') // Remove reference codes like VCARA41800
             .replace(/---/g, ' ')
             .replace(/-/g, ' ')
             .trim()
             .toUpperCase();
        }
    }

    // Logic to detect Gold Color
    let goldColor = "Or Jaune";
    const combinedText = (title + ' ' + description + ' ' + url).toLowerCase();
    if (combinedText.includes('rose')) goldColor = "Or Rose";
    if (combinedText.includes('blanc') || combinedText.includes('platine') || combinedText.includes('white')) goldColor = "Or Blanc";

    // Logic to detect Stone Type
    let stoneType = "Sans Pierre";
    if (combinedText.includes('diamant') || combinedText.includes('diamond')) stoneType = "Diamants";
    if (combinedText.includes('saphir') || combinedText.includes('sapphire')) stoneType = "Saphir";
    if (combinedText.includes('rubis') || combinedText.includes('ruby')) stoneType = "Rubis";
    if (combinedText.includes('onyx')) stoneType = "Onyx";
    if (combinedText.includes('nacre') || combinedText.includes('mother of pearl')) stoneType = "Perles";

    // Logic to detect Brand
    let brand = "Cartier";
    if (url.toLowerCase().includes('vancleef')) brand = "Van Cleef";
    if (url.toLowerCase().includes('bulgari')) brand = "Bulgari";

    return NextResponse.json({
      title,
      imageUrl,
      description,
      goldColor,
      stoneType,
      brand,
      isFallback: !response.ok
    });
  } catch (error) {
    console.error('Error enriching from URL:', error);
    return NextResponse.json({ error: 'Failed to fetch page metadata' }, { status: 500 });
  }
}
