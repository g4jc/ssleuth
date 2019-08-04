_Note : The Domains feature is in beta.

Beginning with version 0.3.1 SSLRank gives you ratings for the domains to which requests are made. Typically when visiting a website, there will be several background requests made with content delivery sites and third-party sites. The connection security would also depend on the connection established with these domains. Also, at times the browser gives an 'insecure' status if there are requests made with insecure (http only) sites. The domains tab would help to identify insecure channels.

The feature is enabled by default. If needed it can be turned off from preferences. 

## Domains tab
The Domains tab groups all the HTTP requests per domain and color codes the entry as per the security rating. Each domain entry gives details on the number of requests made, and a count of the mime-type (RFC 2046) from the requests. The top-level mime-type could be either of text (txt), application (app), image (img), audio (aud), or video (vid). If there are requests to insecure sites, they are highlighted in red. The mime-type count could help to get a quick glance of what is exchanged with these domains.

The feature is in beta, and there can be several glitches. The entries may not be loaded for every new request, and to reload the entries simply tap on the tab title.

## Ratings
The connection status and extended validation status are only available for the main domain. So this is shared with the domain parameters to calculate the ratings.
