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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://www.google.com/',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
    });

    const html = await response.text();

    // Basic meta tag extraction
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const ogImageMatch = html.match(/<meta property="og:image" content="(.*?)"/i);
    const ogDescMatch = html.match(/<meta property="og:description" content="(.*?)"/i);

    const title = titleMatch ? titleMatch[1].split(' - ')[0].replace('Cartier® FR', '').trim() : '';
    const imageUrl = ogImageMatch ? ogImageMatch[1] : '';
    const description = ogDescMatch ? ogDescMatch[1].replace(/<br>/g, '\n').replace(/&bull;/g, '•') : '';

    // Logic to detect Gold Color
    let goldColor = "Or Jaune";
    if (description.toLowerCase().includes('rose') || title.toLowerCase().includes('rose')) goldColor = "Or Rose";
    if (description.toLowerCase().includes('blanc') || title.toLowerCase().includes('blanc') || description.toLowerCase().includes('platine')) goldColor = "Or Blanc";

    // Logic to detect Stone Type
    let stoneType = "Sans Pierre";
    if (description.toLowerCase().includes('diamant')) stoneType = "Diamants";
    if (description.toLowerCase().includes('saphir')) stoneType = "Saphir";
    if (description.toLowerCase().includes('émeraude') || description.toLowerCase().includes('emeraude')) stoneType = "Émeraude";
    if (description.toLowerCase().includes('rubis')) stoneType = "Rubis";

    // Logic to detect Brand
    let brand = "Cartier";
    if (url.includes('vancleefarpels.com')) brand = "Van Cleef";
    if (url.includes('bulgari.com')) brand = "Bulgari";

    return NextResponse.json({
      title,
      imageUrl,
      description,
      goldColor,
      stoneType,
      brand
    });
  } catch (error) {
    console.error('Error enriching from URL:', error);
    return NextResponse.json({ error: 'Failed to fetch page metadata' }, { status: 500 });
  }
}
