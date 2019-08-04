SSLRank
=======

SSLRank is a fork of the SSLeuth addon by Sibi Antony.
The addon is now maintained by Hyperbola Project for UXP applications.

It ranks an established SSL/TLS connection to estimate the connection strength.
It also gives a brief summary of the important SSL/TLS connection parameters.

This was developed with the intent to rate the encryption ciphers used in an
SSL/TLS connection. The project maintains a list of cipher suites that are shipped with
NSS and a rank for each of them.
The rankings are mainly inspired from Qualys's SSL labs server testing tool. The 
SSL labs testing is meant for web servers, more sophisticated and is much more 
than a cipher ranking service. However, to know which ciphers are used when a user
connects to a website, browser support and/or an addon is necessary. Firefox started
exposing the full cipher suite name from version 25.0. Users can see the
cipher suite by going to the `URL notification lock icon -> More information`
or `Page Info -> Security -> Technical details`.
The user can see the cipher suite used for connection and the browser's
assessment of the strength of the cipher.

SSLRank attempts to enhance this visibility of ciphers to the user,
by ranking it and appropriateley color coding it. 
The addon panel also gives information on perfect forward secrecy, browser
connection status and the certificate details.

## Rating Rationale

The rating mechanism is in the early stages now, and might change
in future. See the wiki page on [Rating Mechanism](https://pagure.io/sslrank/blob/master/f/docs/Rating-Mechanism.md) for more information.

## Disabling weak ciphers

Beginning with version 0.2.3 SSLRank supports enabling and disabling cipher suites.
Users can create a list of cipher suites to toggle, and use the notifier right click
menu to toggle them. More details on [enabling/disabling cipher suites](https://pagure.io/sslrank/blob/master/f/docs/Cipher-suites-enabling-and-disabling.md) in the wiki.

## Graphical User Interface

There is a URL bar notification box (next to the browser's own notification
area). A star and the rank notifies the user of the estimated strength.
There is an optional toolbar button mode (choose from preferences), if the
user wishes to move around a toolbar button. 

### Color coding

The color of the notification area changes from green (very good), to blue (good),
orange (medium) and red(bad). 

### Keyboard shortcut

The panel can be easily brought up with the key combinations 'Ctrl' + 'Shift' + '}'. 
If the keyboard shortcut interferes with any existing addon and/or your keyboard doesn't
support the key combination, please report it.
It is however possible to change the keyboard shortcut via configuration.
* Navigate to '`about:config`'
* Key in `extensions.sslrank` to find all sslrank configurables, and look for `extensions.sslrank.ui.keyshortcut`
* The preference type is a string and you can change the modifieres and key. Please follow
mozilla guidelines for [modifiers](https://developer.mozilla.org/en-US/docs/XUL/Attribute/modifiers) and [keys](https://developer.mozilla.org/en-US/docs/XUL/Attribute/key) to set the shortcut. SSLRank uses 'keys' rather than 'keycodes'.

## License

SSLRank is released under [GPLv3.0](https://www.gnu.org/licenses/gpl-3.0.html).
You should find the license text in the About page of add-on preferences.
