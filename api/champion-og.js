export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('Missing tournament ID');
  }

  const userAgent = req.headers['user-agent'] || '';
  const isCrawler = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|slack|discord|linkedin|pinterest/i.test(userAgent);

  if (!isCrawler) {
    // Redirect real browsers directly to the client-side SPA champion page
    res.setHeader('Location', `/tournaments/${id}/champion`);
    return res.status(302).end();
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  let data = null;

  if (supabaseUrl && supabaseKey) {
    // 1. Try calling the RPC get_tournament_champion_card first
    try {
      const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_tournament_champion_card`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tournament_id: id })
      });
      if (rpcResponse.ok) {
        const rpcData = await rpcResponse.json();
        data = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      }
    } catch (err) {
      console.error('API OG: RPC fetch error:', err);
    }

    // 2. Fallback to direct table query
    if (!data || !data.tournament_name) {
      try {
        const tableResponse = await fetch(`${supabaseUrl}/rest/v1/tournament_champions?tournament_id=eq.${id}&select=*`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        if (tableResponse.ok) {
          const tableData = await tableResponse.json();
          data = Array.isArray(tableData) ? tableData[0] : tableData;
        }
      } catch (err) {
        console.error('API OG: Table fetch error:', err);
      }
    }
  }

  // Set default values if data wasn't found or DB check failed
  const username = data?.winner_username || 'A champion';
  const title = `${username} is a TournaHub Champion! 🏆`;
  
  let description = data?.tournament_name 
    ? `Winner of the tournament ${data.tournament_name}!`
    : 'Check out the tournament champion victory page!';

  if (data?.runner_up_username) {
    const scoreText = (data.winner_score !== null && data.runner_up_score !== null)
      ? ` ${data.winner_score}-${data.runner_up_score}`
      : '';
    description = `Beat ${data.runner_up_username}${scoreText} in the ${data.tournament_name} final!`;
  }

  // Use the generated poster image URL as the OG image if available, else winner avatar
  const imageUrl = data?.poster_image_url || data?.winner_avatar_url || '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:site_name" content="TournaHub">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <meta http-equiv="refresh" content="0;url=/tournaments/${id}/champion">
</head>
<body>
  <p>Redirecting to champion victory page... <a href="/tournaments/${id}/champion">Click here</a> if you are not redirected automatically.</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
  return res.status(200).send(html);
}
