Starting from version 0.2.3, SSLRank lets users enable/disable cipher suites. This can be configured from notifier-rightclick-menu -> `Preferences` -> `Cipher suites`.  There are roughly 35 cipher suites that are shipped with Firefox (as of version 28.0). Users can create a list of cipher suites, and choose to enable, disable or reset to their default values. The configured lists will appear in the right click menu of the notifier. By default, SSLRank leaves all the cipher suites as is, and nothing will be done unless user initiates enable/disable.

## Important things to note

* The list is global and enabling/disabling the cipher suites will impact all new pages you're going to visit - and not just the page you're in now. 
* Avoid creating lists which has cipher suites in common. And if you do, note that the lists are enabled/disabled in the order in which the lists are created. The final list takes precedence over the others.
* When creating a new list, the available cipher suites are scanned from the currently used version of UXP (from the security.ssl3.* branch). So the list may not be really portable across new UXP releases when cipher suites are added/removed. To be on the safe side, and to not to clutter user preferences, SSLRank would only touch a cipher suite if it is actually present.
* Most often page contents are cached, so once you toggle a list of cipher suites, SSLRank will automatically do a cache-overriding reload if the current tab is on a secure page. (This behaviour could be made configurable in a future release).

## Toggle states

* Default = The cipher suites in the list are reset to their default value once. Following which the states are left untouched. 
* Enable = The cipher suites in the list are enabled for use.
* Disable = The cipher suites in the list are disabled from use. 

If in case something goes wrong, buttons are available to restore the addon default list or reset the entire cipher suites to their default state. 

## Toggle lists

There are two lists that are pre-configured for users' convenience.
* a list of RC4 based cipher suites
* and a list of cipher suites which doesn't offer perfect forward secrecy (excluding the RC4 suites which are in the first list). 
So users can choose to disable both and try to connect with stronger suites (or one after another checking for availability of cipher suites with server)

A better way to organize your list would be to create a list of all suites, disable them, and then a list of stronger suites and enable them. Due to some technical difficulties (Cipher suites differences across UXP releases etc.) such a config is not pre-created in SSLRank.
