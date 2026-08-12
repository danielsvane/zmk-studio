# Changelog

## [0.4.1](https://github.com/danielsvane/zmk-studio/compare/v0.4.0...v0.4.1) (2026-08-12)


### Bug Fixes

* **download:** address the rolling release by tag, not /releases/latest ([b79cb58](https://github.com/danielsvane/zmk-studio/commit/b79cb585ea9abd5ee8a5a4a25a7d184d977a5bd1))

## [0.4.0](https://github.com/danielsvane/zmk-studio/compare/v0.3.1...v0.4.0) (2026-08-12)


### ⚠ BREAKING CHANGES

* **updater:** the updater's public key is compiled into the binary, so copies installed before this release cannot update themselves to it — install this version by hand once and updates after that are in-app. Debian package installs never self-update, since the plugin only rewrites AppImages on Linux.

### Features

* Add headers to key in resting / non hover state ([#157](https://github.com/danielsvane/zmk-studio/issues/157)) ([0f965ed](https://github.com/danielsvane/zmk-studio/commit/0f965ed8b744f487ab68c5d9ac03865f01ecef69))
* **backup:** export/import full device config as versioned JSON ([1e82b76](https://github.com/danielsvane/zmk-studio/commit/1e82b76cedaad3a3e7b832964d11c51e10394ae6))
* **behavior-picker:** surface recently-used behaviors in the select ([5add2ce](https://github.com/danielsvane/zmk-studio/commit/5add2ce334a34388ea3a247bc4a95117d6bdbd23))
* **behaviors:** add visual key grid for key-press bindings ([a3386fb](https://github.com/danielsvane/zmk-studio/commit/a3386fb6328b869ca9a326b0b13d4e36b3082080))
* **behaviors:** shared key-grid slot picker for mod-tap params ([6d5f62b](https://github.com/danielsvane/zmk-studio/commit/6d5f62b4a6cf1ee5a89a42ca9cdf6218749bd83a))
* **behaviors:** show key grid for mixed params like layer-tap ([c773c10](https://github.com/danielsvane/zmk-studio/commit/c773c1057ffbabd93bb9c8a579e01e18a6a856fc))
* **behaviours:** bring the page up to standard with combos ([5261ebd](https://github.com/danielsvane/zmk-studio/commit/5261ebd4f4e0c1fd5355474e690f63063f530dd5))
* **behaviours:** explain factory behaviours reload on reboot ([a5ab48f](https://github.com/danielsvane/zmk-studio/commit/a5ab48f1808ac3ac912e1529e9b93cf702592b0d))
* **behaviours:** explain the hold-tap settings with info tips ([8a0f718](https://github.com/danielsvane/zmk-studio/commit/8a0f7182435ba7c8ccf8579f2f9bb973ee39c3cd))
* **behaviours:** note a board reset alone restores factory behaviours ([6f4979f](https://github.com/danielsvane/zmk-studio/commit/6f4979f2124796859fdd19b403618e4354fd52f8))
* **behaviours:** refine field layout — Type as disabled Select, widths, gaps ([5c9ded2](https://github.com/danielsvane/zmk-studio/commit/5c9ded24a7dea756bf7b0cced931322e9982e4bb))
* **combos,behaviours:** readable list rows + width-filling combo preview ([41b2cfe](https://github.com/danielsvane/zmk-studio/commit/41b2cfe65856ffa6773ea6562b224d2fbef27958))
* **combos:** active card uses the hover background ([6bb0061](https://github.com/danielsvane/zmk-studio/commit/6bb00610607d0fbf2df1b460f50084940b9ee8bf))
* **combos:** calmer editor chrome — flat delete, fit-width apply, narrower fields ([b56b501](https://github.com/danielsvane/zmk-studio/commit/b56b501f8bf48669073f09780ccc6f0cdf8ba888))
* **combos:** collapse advanced fields + fix key-positions label ([6c4eb10](https://github.com/danielsvane/zmk-studio/commit/6c4eb107415e70a9a6bbc95385c184cc7f64eefd))
* **combos:** explain the advanced combo settings with info tips ([f89f492](https://github.com/danielsvane/zmk-studio/commit/f89f49233d77245fe8cfde3feeee63afb2ac529f))
* **combos:** legible preview keys + roomier list spacing ([1a3449e](https://github.com/danielsvane/zmk-studio/commit/1a3449e28bda767437ac3ca53710494085d99a0a))
* **combos:** move behaviour picker directly under the key picker ([095c74f](https://github.com/danielsvane/zmk-studio/commit/095c74fdfa61734f244626a9447e4c1bae64e6be))
* **combos:** pick combo key positions on the keyboard ([c1f58ca](https://github.com/danielsvane/zmk-studio/commit/c1f58ca31a095ef37086f1faf3e7055b42655e6b))
* **combos:** unify the editor on the shared control design system ([f5b67ce](https://github.com/danielsvane/zmk-studio/commit/f5b67ce296159ab569b0fbd1556533c1cab81cbd))
* **connect:** auto-reconnect USB and poll lock state ([14f7bf1](https://github.com/danielsvane/zmk-studio/commit/14f7bf13b2205544220c8d0bfbff3b57fccf8f92))
* **connect:** list wireless as unavailable with its requirements ([a30a4cf](https://github.com/danielsvane/zmk-studio/commit/a30a4cff766195becf784a5baeeee665b3709724))
* **design-system:** generic DropdownMenu + unified hover/active standards ([6fa5f62](https://github.com/danielsvane/zmk-studio/commit/6fa5f620f037c91c3abd55c730f99f2e1d867a2a))
* **download:** publish a rolling desktop build of customkeyboards ([1e3f8f7](https://github.com/danielsvane/zmk-studio/commit/1e3f8f733a06c1a819f90754d3474ead34159633))
* **download:** serve the fork's desktop build, not upstream's ([5e8f702](https://github.com/danielsvane/zmk-studio/commit/5e8f702ac2263287e1d1c007f80e0c6f23f06021))
* **header:** add icons to section tabs + match "Studio" weight ([ec70b06](https://github.com/danielsvane/zmk-studio/commit/ec70b06a1cb2bc13e2481c7197ddbeef94333e85))
* **key-picker:** left-align the keyboard, bump label size, trim the footer ([e6ab85d](https://github.com/danielsvane/zmk-studio/commit/e6ab85d0d5f86bfd30547ac2310445fdeff7981e))
* **key-position-picker:** drop the per-key index label ([e9758a2](https://github.com/danielsvane/zmk-studio/commit/e9758a2ce61c19c3e85ea82ce2f4367095399ee5))
* **keyboard:** caps-lock icon + distinguish backspace/forward-delete ([7cebd0f](https://github.com/danielsvane/zmk-studio/commit/7cebd0f5adcb1c5f16c33ebca7e6061f93b1f14d))
* **keyboard:** render lucide icons for HID usages ([aedc89b](https://github.com/danielsvane/zmk-studio/commit/aedc89b8af19a81908462bc67bc6d398ecb62a1d))
* **keyboard:** show both params of a binding on the key ([dc7f3ad](https://github.com/danielsvane/zmk-studio/commit/dc7f3addd586631858d1861566aeccd6daf53675))
* **keymap:** deselect a key by clicking it again ([c2e0269](https://github.com/danielsvane/zmk-studio/commit/c2e0269ee4fa09422899e585dfeace7da68e9931))
* **keymap:** show target layer name on layer-tap keys ([2d74f9c](https://github.com/danielsvane/zmk-studio/commit/2d74f9c6e09b7ddbfce12face4b482bb79fd7472))
* **layers:** make the layer toolbar two icon buttons with modals ([c1c1dc0](https://github.com/danielsvane/zmk-studio/commit/c1c1dc0d9a939149fc17a17b4b9c99356ce3d312))
* **layers:** match the layer picker to the combo/behaviour sidebars ([3fc2b11](https://github.com/danielsvane/zmk-studio/commit/3fc2b1173528d429380838455c6fe0810c157a75))
* **layers:** restructure the layer sidebar to match combos/behaviours ([fe23b2e](https://github.com/danielsvane/zmk-studio/commit/fe23b2e632a471452f00934f4878e03310907da7))
* **layout:** maximize keyboard view, drop zoom picker and footer ([3dab5c2](https://github.com/danielsvane/zmk-studio/commit/3dab5c2df08b5681542c4f1f66c72de51fe4d8a5))
* **modals,forms:** icons on action buttons; ghost dismiss buttons ([d1b6185](https://github.com/danielsvane/zmk-studio/commit/d1b6185e0bdc1dadec7c69f122d6bcf0aa2fdadb))
* **picker:** 48px hit targets and consistent 14px text across the binding drawer ([bbd56c3](https://github.com/danielsvane/zmk-studio/commit/bbd56c32d6f887975117f929c75917df4eef246f))
* **picker:** bump md control + key-grid text to 16px (base) ([70e32db](https://github.com/danielsvane/zmk-studio/commit/70e32dbed4bf0b0f93270784395c785da0e94d3c))
* **picker:** label every key-picker input ([524a89d](https://github.com/danielsvane/zmk-studio/commit/524a89d6b7cebad11aef53af6ad0bf45b44f9b54))
* **picker:** raise the side-by-side flip to 88rem ([5b10452](https://github.com/danielsvane/zmk-studio/commit/5b10452552855cbd0682f482228d84b3d0f0c921))
* **picker:** roomier drawer spacing and a taller reserved height ([6a895f7](https://github.com/danielsvane/zmk-studio/commit/6a895f73c2b6b30511eef2eaebdec40f1913f353))
* **picker:** tabbed key picker (Basic / Symbols / Numpad / Media / Intl) ([be4f91f](https://github.com/danielsvane/zmk-studio/commit/be4f91fac8f10a05a4c5b756894009ba0553850c))
* **picker:** unify segmented controls on ToggleButtonGroup ([2eb81c5](https://github.com/danielsvane/zmk-studio/commit/2eb81c561782eb260e933222e3eb76e41f2d2b5a))
* **sidebar:** make combo/behaviour rows read as clickable ([8603679](https://github.com/danielsvane/zmk-studio/commit/8603679ae33a2670c6436074a080ae7daf50abcb))
* **theme:** add blue call-to-action color for primary buttons ([15bdb9d](https://github.com/danielsvane/zmk-studio/commit/15bdb9d2795420cf901871f9c0ab16109b9c276e))
* **theme:** light/dark switcher + light-mode polish ([f03025c](https://github.com/danielsvane/zmk-studio/commit/f03025c795db90f9001d4a4908440bc5380951db))
* **toggle-group:** add `fill` prop to size segments to content ([92732ac](https://github.com/danielsvane/zmk-studio/commit/92732ac60bec5bc5a7f25e8716b5c75ca0af67c6))
* **ui:** add reusable Button component with variants, toggle, and group ([0f3c596](https://github.com/danielsvane/zmk-studio/commit/0f3c59630f15d272013e2982580b6cb00d92dd50))
* **ui:** add searchable Select; move HID usage picker onto it ([84891ee](https://github.com/danielsvane/zmk-studio/commit/84891ee1f11d8b83f92074de173a2267aeb634de))
* **ui:** add Select and shared Field form components ([72c1e11](https://github.com/danielsvane/zmk-studio/commit/72c1e11f4e8b14845b29e9ce3b03432cd5647874))
* **ui:** split layers/combos into pages with header nav ([c12f4b0](https://github.com/danielsvane/zmk-studio/commit/c12f4b022914104a6b5cddd2313f5bcbdff569ed))
* **updater:** sign builds and publish an update manifest ([e5c8ede](https://github.com/danielsvane/zmk-studio/commit/e5c8edea27aff2ae9a1c8999c21fcc23b83c368b))


### Bug Fixes

* **app:** Show "Unnamed device" rather than "TODO" ([#146](https://github.com/danielsvane/zmk-studio/issues/146)) ([de19db3](https://github.com/danielsvane/zmk-studio/commit/de19db3f1e2d8dd35cd9cfa61d60707a336f8451))
* **behaviours:** drop icons from add-behaviour dialog actions ([31e2d7f](https://github.com/danielsvane/zmk-studio/commit/31e2d7fc607802b04acba0558cf72d37d97dda37))
* **behaviours:** name a new behaviour instead of prompting for one ([e90683b](https://github.com/danielsvane/zmk-studio/commit/e90683b410bd411a398ba00413bba40d1e7f6e6c))
* **checkbox:** tighten row height so stacked checkboxes share the form rhythm ([3e11763](https://github.com/danielsvane/zmk-studio/commit/3e117633d463ecafdb3228cfebb257b74511a0c6))
* **combo-preview:** stop preview keys animating in from tiny size ([5f184e6](https://github.com/danielsvane/zmk-studio/commit/5f184e6f6203e52e6f5dc76356181395e12b2c09))
* **combos:** keep a gap below Apply at the scroll end ([7f2f07b](https://github.com/danielsvane/zmk-studio/commit/7f2f07bf615171507f0394bc5ed34a4164c1e462))
* **combos:** keep the editor scrolling within its column ([978c27e](https://github.com/danielsvane/zmk-studio/commit/978c27ec0f2fc1c290ba480c28f45ff500c7bfac))
* **combos:** start new combos empty instead of seeding defaults ([26dbe27](https://github.com/danielsvane/zmk-studio/commit/26dbe2737ccf3ee24916f2b9cd90212513007f55))
* **deploy:** pin the server ts-client to customkeyboards ([8059718](https://github.com/danielsvane/zmk-studio/commit/8059718dd095d77326cd4c9c3c05bb0e950bfd7d))
* **deploy:** reset the server checkout instead of pulling into a dirty tree ([132c68c](https://github.com/danielsvane/zmk-studio/commit/132c68c6bad6798bab9d09df2a3c88bbeee90e86))
* **infotip:** open the bubble above the label, not over the field ([36afd5c](https://github.com/danielsvane/zmk-studio/commit/36afd5cbf05965b6f03cb96df9ddb8127384c5fc))
* **key-picker:** show compact glyphs, not width-adaptive long names ([db92e56](https://github.com/danielsvane/zmk-studio/commit/db92e56886678917dec8d3cf0162c1b4b5b0f2ee))
* **keyboard:** cap binding-drawer height so extra space goes to the keyboard ([70c10b2](https://github.com/danielsvane/zmk-studio/commit/70c10b2c6367921738e43dac2ba69a3d2d927cfa))
* **keyboard:** drive PhysicalLayout hover off interactivity ([bb74d6c](https://github.com/danielsvane/zmk-studio/commit/bb74d6ce965dd1653cfa4aa8b43ba83ca72cddc8))
* **keyboard:** prevent keys vanishing on fast hover ([24d0c62](https://github.com/danielsvane/zmk-studio/commit/24d0c6291dad0fcdc95cfbec3391d7dfb905d4a5))
* **keyboard:** readable behavior labels using ZMK & syntax ([bc019b2](https://github.com/danielsvane/zmk-studio/commit/bc019b2ede4b18db88a9b77334f5439cdcbe1305))
* **keyboard:** render the keymap sharply in Firefox ([16dccf8](https://github.com/danielsvane/zmk-studio/commit/16dccf882fb527c3bc7de6645647f1910ef86506))
* **keyboard:** tune binding-drawer reserve to its tallest content ([ef1b9be](https://github.com/danielsvane/zmk-studio/commit/ef1b9bedef9af1a6dc41e3706ec80d0f0c64d36f))
* keys not rerendering between layers ([#132](https://github.com/danielsvane/zmk-studio/issues/132)) ([84f1e3b](https://github.com/danielsvane/zmk-studio/commit/84f1e3bb3bc550ed314dea95ea93c611e4184bdb))
* **layers:** reserve a fixed-height binding drawer so the keyboard doesn't reflow ([13b9d03](https://github.com/danielsvane/zmk-studio/commit/13b9d0334082ff8af7d82c4099a40242be759146))
* **layout:** give every page's left sidebar the same width ([98db989](https://github.com/danielsvane/zmk-studio/commit/98db98916e06c32e576124c3590172f4b5e798d1))
* **layout:** lock the document so only inner panels scroll ([2ddc2ac](https://github.com/danielsvane/zmk-studio/commit/2ddc2ac2445abb1dcadb25b5eda2d3e202c3b694))
* **picker:** raise the stacked controls cap to 38rem so modifiers fit ([f30aa73](https://github.com/danielsvane/zmk-studio/commit/f30aa739099579f20694b8aa53e2ea5a25191b55))
* rebuild searchable key picker on react-aria ComboBox ([33466a5](https://github.com/danielsvane/zmk-studio/commit/33466a52e528ecae98b0c7e7111d5775129a16a3))
* **storybook:** regenerate Tailwind CSS when source files are added ([b5ba32e](https://github.com/danielsvane/zmk-studio/commit/b5ba32e8e0938e42bb79feedc6d4eb8100473f79))
* **storybook:** size stories to content instead of forcing full height ([b666072](https://github.com/danielsvane/zmk-studio/commit/b666072c028a59d0acd5f07a6856710d4a71bc63))
* **theme:** restore Tailwind's default font-size scale ([307e5aa](https://github.com/danielsvane/zmk-studio/commit/307e5aa5a0267aac67b702ff89e7bca46943b906))
* **ui:** keep the ToggleGroup focus ring inside its segment ([3862b57](https://github.com/danielsvane/zmk-studio/commit/3862b576a8f56ec026a2bd065eb4d528ca872b53))


### Performance Improvements

* **behaviors:** stabilize usagePages identity; stop mutating behaviors prop ([5356338](https://github.com/danielsvane/zmk-studio/commit/5356338c4586e0209c1e843420e5d1bcde05b5b6))
* **keyboard:** tree-shake lucide icon imports ([923f284](https://github.com/danielsvane/zmk-studio/commit/923f284992d49d65acb40a1573384f3bfe89a63c))
* virtualize the HID usage picker dropdown ([58fa553](https://github.com/danielsvane/zmk-studio/commit/58fa553c6852503630d90924344088cb9e54d623))

## [0.3.1](https://github.com/zmkfirmware/zmk-studio/compare/v0.3.0...v0.3.1) (2025-01-20)


### Bug Fixes

* **ci:** Support token auth on release fetch ([#126](https://github.com/zmkfirmware/zmk-studio/issues/126)) ([0662e6d](https://github.com/zmkfirmware/zmk-studio/commit/0662e6d506715232b1cee872f7354435c0cdea16))

## [0.3.0](https://github.com/zmkfirmware/zmk-studio/compare/v0.2.4...v0.3.0) (2025-01-20)


### Features

* Add Download Page ([#105](https://github.com/zmkfirmware/zmk-studio/issues/105)) ([2b88c5c](https://github.com/zmkfirmware/zmk-studio/commit/2b88c5c6248c42719b404a67c33fa25a133a057a))
* Support MacOS Universal Installer ([c43357e](https://github.com/zmkfirmware/zmk-studio/commit/c43357e3784da10ca4129ac02a20b6159e0a1c3b))
* Support MacOS Universal Installer ([#104](https://github.com/zmkfirmware/zmk-studio/issues/104)) ([c43357e](https://github.com/zmkfirmware/zmk-studio/commit/c43357e3784da10ca4129ac02a20b6159e0a1c3b))


### Bug Fixes

* app crash when reach last index of undo stack ([#111](https://github.com/zmkfirmware/zmk-studio/issues/111)) ([3370faa](https://github.com/zmkfirmware/zmk-studio/commit/3370faa3c9f6288dda613d35c42a8d30001edff6))

## [0.2.4](https://github.com/zmkfirmware/zmk-studio/compare/v0.2.3...v0.2.4) (2024-11-22)


### Bug Fixes

* **app:** Tweak webkit dep version for CI builds ([#92](https://github.com/zmkfirmware/zmk-studio/issues/92)) ([5c018bc](https://github.com/zmkfirmware/zmk-studio/commit/5c018bcbc44d0dfb219cab239877a9b1d441c101))

## [0.2.3](https://github.com/zmkfirmware/zmk-studio/compare/v0.2.2...v0.2.3) (2024-11-13)


### Bug Fixes

* Add link to unlock behavior docs in unlock modal ([#90](https://github.com/zmkfirmware/zmk-studio/issues/90)) ([9d35061](https://github.com/zmkfirmware/zmk-studio/commit/9d35061b30b394b21dd12df6d763cd9daeed355e))
* Remove beta warning from connect modal. ([#88](https://github.com/zmkfirmware/zmk-studio/issues/88)) ([6edb4b0](https://github.com/zmkfirmware/zmk-studio/commit/6edb4b02a104add079ae2f85cfa0d239a54f553b)), closes [#87](https://github.com/zmkfirmware/zmk-studio/issues/87)

## [0.2.2](https://github.com/zmkfirmware/zmk-studio/compare/v0.2.1...v0.2.2) (2024-11-12)


### Bug Fixes

* **ci:** Bump tauri.conf.json version as well. ([#84](https://github.com/zmkfirmware/zmk-studio/issues/84)) ([435512a](https://github.com/zmkfirmware/zmk-studio/commit/435512a27bd55978e925db95b271fe844befb688))

## [0.2.1](https://github.com/zmkfirmware/zmk-studio/compare/v0.2.0...v0.2.1) (2024-11-12)


### Bug Fixes

* **ci:** Proper release-please support for Tauri ([#77](https://github.com/zmkfirmware/zmk-studio/issues/77)) ([0902316](https://github.com/zmkfirmware/zmk-studio/commit/0902316fb498d7801d99d4ac021b69ca0b2ee7fd))

## [0.2.0](https://github.com/zmkfirmware/zmk-studio/compare/v0.1.2...v0.2.0) (2024-11-11)


### Features

* Sort behaviors by label ([#75](https://github.com/zmkfirmware/zmk-studio/issues/75)) ([a996e4e](https://github.com/zmkfirmware/zmk-studio/commit/a996e4efefd9405cbf35f35d3ceaa62b71b0deb9))

## [0.1.2](https://github.com/zmkfirmware/zmk-studio/compare/v0.1.1...v0.1.2) (2024-10-16)


### Bug Fixes

* Raise and report errors on connect. ([#65](https://github.com/zmkfirmware/zmk-studio/issues/65)) ([957aabe](https://github.com/zmkfirmware/zmk-studio/commit/957aabea1bf9b7316b81e0d9b68580b398f816c2))

## [0.1.1](https://github.com/zmkfirmware/zmk-studio/compare/v0.1.0...v0.1.1) (2024-10-10)


### Bug Fixes

* Add beta warning to the connect modal. ([#58](https://github.com/zmkfirmware/zmk-studio/issues/58)) ([5152b1d](https://github.com/zmkfirmware/zmk-studio/commit/5152b1d2f795c7647ad77facbd3a1480c56949ce))
* Add ZMK links to the about modal. ([#56](https://github.com/zmkfirmware/zmk-studio/issues/56)) ([3c319b5](https://github.com/zmkfirmware/zmk-studio/commit/3c319b5668279c9f118cf6721b64ce203e882613))

## [0.1.0](https://github.com/zmkfirmware/zmk-studio/compare/v0.0.3...v0.1.0) (2024-10-09)


### Features

* Add alert on connect failures, bump deps. ([#47](https://github.com/zmkfirmware/zmk-studio/issues/47)) ([997edc9](https://github.com/zmkfirmware/zmk-studio/commit/997edc97754c3e831175d0c065202c61fcf12a3f))
* Detailed save changes response data. ([#49](https://github.com/zmkfirmware/zmk-studio/issues/49)) ([967aff4](https://github.com/zmkfirmware/zmk-studio/commit/967aff48eee504fe0f1a8b22fc36146536c70368))
* Improved key rendering for HID usages. ([#53](https://github.com/zmkfirmware/zmk-studio/issues/53)) ([14bcaa7](https://github.com/zmkfirmware/zmk-studio/commit/14bcaa79781e53e11af7e9c9d50ae7b7999747d0))


### Bug Fixes

* **app:** Handle manual disconnect for serial transport ([#55](https://github.com/zmkfirmware/zmk-studio/issues/55)) ([3da464f](https://github.com/zmkfirmware/zmk-studio/commit/3da464f892edfe3a459de78b5da862fa938cf3b4))
* Fix Wayland resize/decoration bug. ([#51](https://github.com/zmkfirmware/zmk-studio/issues/51)) ([3ca0679](https://github.com/zmkfirmware/zmk-studio/commit/3ca0679c8238eef02fbfaadd84f712beb2f6735b))

## [0.0.3](https://github.com/zmkfirmware/zmk-studio/compare/v0.0.2...v0.0.3) (2024-10-02)


### Miscellaneous Chores

* Fixes for prod push for releases. ([#45](https://github.com/zmkfirmware/zmk-studio/issues/45)) ([6e05f49](https://github.com/zmkfirmware/zmk-studio/commit/6e05f49b42343c202b0da2bfa8da01bfebe3c550))

## [0.0.2](https://github.com/zmkfirmware/zmk-studio/compare/v0.0.1...v0.0.2) (2024-10-02)


### Miscellaneous Chores

* Bump to Tauri v2 release. ([#42](https://github.com/zmkfirmware/zmk-studio/issues/42)) ([57b3274](https://github.com/zmkfirmware/zmk-studio/commit/57b3274688161a3599f96fba5db1cd671620cf0c))
* Fix release-please automation. ([#43](https://github.com/zmkfirmware/zmk-studio/issues/43)) ([1156c47](https://github.com/zmkfirmware/zmk-studio/commit/1156c47fe3c761e2240128b77f5a72d8dfe17efe))

## 0.0.1 (2024-09-30)


### Features

* Add a few more Consumer overrides. ([2e32100](https://github.com/zmkfirmware/zmk-studio/commit/2e321002843a90d614b7f3b802a44b8cd3a229f5))
* Add a few more HID name overrides. ([30789f6](https://github.com/zmkfirmware/zmk-studio/commit/30789f603b83d8431272c0dac14ceadb1f0105fc))
* Add aboud and license notice modals. ([b9d2692](https://github.com/zmkfirmware/zmk-studio/commit/b9d2692f434740ced2eb40158a2793ec830b6fa7))
* Add disconnect and settings reset UI. ([18b3f22](https://github.com/zmkfirmware/zmk-studio/commit/18b3f22a0bc09223b9bce777da24303b7e276780))
* Add HID label overrides. ([5216e8e](https://github.com/zmkfirmware/zmk-studio/commit/5216e8e9a4557a42e31d499a0453a2462634247d))
* Add HID usage modifier editing. ([14a1578](https://github.com/zmkfirmware/zmk-studio/commit/14a157851569b5940033c8c9031941119d6cdd0b))
* add hover effects to device menu items ([ffd42ee](https://github.com/zmkfirmware/zmk-studio/commit/ffd42eea2eac3ccf5fea92619d236d2932250cb0))
* Add layout rotation support. ([4331681](https://github.com/zmkfirmware/zmk-studio/commit/4331681489e23dd7b7a7cb616876536bb5d2962f))
* Add limits for usages in the list, re-render fixes. ([30f7077](https://github.com/zmkfirmware/zmk-studio/commit/30f707731fe593e6159d15ba1b1316fdf02aa6ea))
* Add names for some keypad key codes ([#34](https://github.com/zmkfirmware/zmk-studio/issues/34)) ([59a6441](https://github.com/zmkfirmware/zmk-studio/commit/59a6441f83ce7857530d62bc666b2652d7706582))
* Add primitive layout picker control. ([e77c09b](https://github.com/zmkfirmware/zmk-studio/commit/e77c09bee86f3baa50f8c8bbfe6c9a1d0628c4b5))
* Add tauri CLI for connecting to serial port. ([86840df](https://github.com/zmkfirmware/zmk-studio/commit/86840dfabb4c743c36a70a4b88f48dbcce9adc92))
* Add UI in connect model when no transports ([9d58e0e](https://github.com/zmkfirmware/zmk-studio/commit/9d58e0e21cbfe0b0781b3b20386bfba1b5b2f068)), closes [#16](https://github.com/zmkfirmware/zmk-studio/issues/16)
* add UI to close about license modals ([01cc93b](https://github.com/zmkfirmware/zmk-studio/commit/01cc93bf630acb71dbb76795da26948ffdb35ed6))
* Add unlock/lock handling. ([6a742e1](https://github.com/zmkfirmware/zmk-studio/commit/6a742e1169c9640619827f097ffb4c76851dea6c))
* Auto-zoom keymap layout ([c98743e](https://github.com/zmkfirmware/zmk-studio/commit/c98743e6a742a568cacf7f908e381956c4299071))
* Basic CI for building apps across platforms. ([2360283](https://github.com/zmkfirmware/zmk-studio/commit/236028364cfc17a75060647cd97f1366285e3214))
* Better detection of proper conn. ([6963c29](https://github.com/zmkfirmware/zmk-studio/commit/6963c299dfbe02fb625b2176ae75bc17adb3127a))
* Better physical layout picker with preview. ([89b38b3](https://github.com/zmkfirmware/zmk-studio/commit/89b38b3ad7e35e7ebddfa962f429e6ba38ff217a))
* Bump client version. ([1b0c8c4](https://github.com/zmkfirmware/zmk-studio/commit/1b0c8c4b9aec2dfbbf4c47e5005c463ac9d8021d))
* Display device name in header. ([d4285a6](https://github.com/zmkfirmware/zmk-studio/commit/d4285a65608e2c283a64133d9d04e3c0e2f3bd22))
* Handle keymap/layout mismatches. ([67bc71a](https://github.com/zmkfirmware/zmk-studio/commit/67bc71abde19679c35297892cce3fe54905cfe77))
* Initial work on skeleton of ZMK Studio UI. ([5a19aa4](https://github.com/zmkfirmware/zmk-studio/commit/5a19aa4a098b76b99954e771120715fc3f50b97c))
* Initial work to reload keymap on layout change. ([fc55232](https://github.com/zmkfirmware/zmk-studio/commit/fc5523214fb99d1dfbef973604361840c590a3f5))
* Layer reordering ([a7bc01d](https://github.com/zmkfirmware/zmk-studio/commit/a7bc01d3ab5321174aafa86c6143f24bb18eaac6))
* More complete disconnect and notif support. ([77062af](https://github.com/zmkfirmware/zmk-studio/commit/77062af5ede8e4e2c28b9e64f5d8206f6f5c1242))
* Move to proper layer IDs. ([44badf1](https://github.com/zmkfirmware/zmk-studio/commit/44badf16fc2eba70b6931919f7f427d781b8fc88))
* Propagate layout selection to the device. ([c2cf65c](https://github.com/zmkfirmware/zmk-studio/commit/c2cf65c35bc3ab36cc57bcddc5842a33f40886eb))
* Properly implement Discard. ([e7a25c0](https://github.com/zmkfirmware/zmk-studio/commit/e7a25c02356d141f988bc9c04d09757c611916c1))
* Release automation using release-please ([f69b015](https://github.com/zmkfirmware/zmk-studio/commit/f69b0151edbc56c95fd0d2e2287e2d8942b2fe79))
* replace edit label prompt with modal ([44acf8c](https://github.com/zmkfirmware/zmk-studio/commit/44acf8c1f5bb8aac8911811fa13cd033be606ba0))
* Show selected key in a physical layout. ([1dc11c8](https://github.com/zmkfirmware/zmk-studio/commit/1dc11c8fb34c8c6fecb8070ed78aea502b078e16))
* Start to incorporate theme colors. ([664d6f3](https://github.com/zmkfirmware/zmk-studio/commit/664d6f3b360e0169cb496871f7e9f87b107a8631))
* Style adjustments ([332d737](https://github.com/zmkfirmware/zmk-studio/commit/332d7374550039a7c6b527ddd10b475f98000d9b))
* Tailwind, prettier, Gorton keys. ([f942781](https://github.com/zmkfirmware/zmk-studio/commit/f942781394954dfad22768929637ac86f36cdcac))
* Ton of layer operations. ([28f2625](https://github.com/zmkfirmware/zmk-studio/commit/28f262557fe457a6eb7d01c1733fb97171a73f27))
* Tons of layout fixes, device selection. ([177f2df](https://github.com/zmkfirmware/zmk-studio/commit/177f2dfe38982c9acba8f08a2737963f460ac1f5))
* Undo/redo, binding updates, save changes. ([47eeb1c](https://github.com/zmkfirmware/zmk-studio/commit/47eeb1caba476868420ca3e0cbf94558e1865a8e))
* Various layout/key render work, theme fixes ([d66d560](https://github.com/zmkfirmware/zmk-studio/commit/d66d560a6c3de41d25502e8f601e63b20cbab38f))
* Windows app/installer signing. ([81a42b5](https://github.com/zmkfirmware/zmk-studio/commit/81a42b5bb91471dfd6a83f5c80cce697097204e2))


### Bug Fixes

* Add `will-change: transform` to force anti-aliasing. ([899c355](https://github.com/zmkfirmware/zmk-studio/commit/899c3556b8ca5c87434912afbd19d109cd26ac7d))
* Add Info.plist for BT access request on macOS. ([2412e70](https://github.com/zmkfirmware/zmk-studio/commit/2412e70ee14f8beeadc3cfe794f913701f0c7be6))
* **app:** Properly load when BT adapter is off. ([3241568](https://github.com/zmkfirmware/zmk-studio/commit/324156873ae69850c319ccedda613635fcc8c342))
* **app:** Workaround for GNOME/Wayland resize bug. ([153a035](https://github.com/zmkfirmware/zmk-studio/commit/153a0355a0a09e0303ed66f845deae7c94801304))
* BT connections on macOS must explicitly connect. ([adf1d01](https://github.com/zmkfirmware/zmk-studio/commit/adf1d01bffaa265215a8c328f8af084431fef58c))
* Build fixes after tweaks. ([679c5ec](https://github.com/zmkfirmware/zmk-studio/commit/679c5ec3c99a2dd203ca2da61245683b8d3a2e38))
* Build gatt transport on macOS. ([1351d5f](https://github.com/zmkfirmware/zmk-studio/commit/1351d5fa34b941e51ef7e132be0e47449a103d4b))
* Bump tauri deps to use custom IPC encoding. ([c6de9de](https://github.com/zmkfirmware/zmk-studio/commit/c6de9de6b0bf4e585f06ccaf39e56e5156e53db8))
* Bump tauri versions, fix CSP ICP issue. ([ba15adc](https://github.com/zmkfirmware/zmk-studio/commit/ba15adc034efe970f2cc263e8f1bf0b8e2987103))
* Bump to client with Windows fixes. ([ad48405](https://github.com/zmkfirmware/zmk-studio/commit/ad48405ce7f83f5ccbc02d29e6535ebd2da5f698))
* Fix up bluest usage for CoreBluetooth. ([0df090b](https://github.com/zmkfirmware/zmk-studio/commit/0df090b34610b2aeaf03f350b1ac5845b8143e72))
* HID override build fix, more overrides. ([8c1633e](https://github.com/zmkfirmware/zmk-studio/commit/8c1633e3bbf68ca647bd76ea45f509343ac9b233))
* Layout fixes. ([eb1d836](https://github.com/zmkfirmware/zmk-studio/commit/eb1d836499e197f0c7e41d431db5922497ec75c9))
* Layout rotation fixes. ([4e53eaf](https://github.com/zmkfirmware/zmk-studio/commit/4e53eaf452e98526f985120c44c68187528c84bc))
* Minor TS fix. ([d377f6c](https://github.com/zmkfirmware/zmk-studio/commit/d377f6c5f5ac6c8fd3c91d613900a56297bea257))
* Modifier selection sizing fixes. ([d966f9d](https://github.com/zmkfirmware/zmk-studio/commit/d966f9d4b90d3686dd38d618a0f1584810468edf))
* Only force connect to devices on macos. ([c199d58](https://github.com/zmkfirmware/zmk-studio/commit/c199d583b77ceef0c4179191881042a370b3a30c))
* Proper 2-param behavior editing. ([b254dac](https://github.com/zmkfirmware/zmk-studio/commit/b254dac0168c763b21d6c002f1eac3c01c9f69fd))
* Proper disconnect/reconnect of BLE. ([635d7b9](https://github.com/zmkfirmware/zmk-studio/commit/635d7b9b195a1cae039022360ec8e7e0b334b3d2))
* Proper logo and title. ([8df6f1e](https://github.com/zmkfirmware/zmk-studio/commit/8df6f1e1791e867e41672bb3b42ef1ad81fe75c4))
* Proper type for device info RPC response. ([7f02898](https://github.com/zmkfirmware/zmk-studio/commit/7f0289829f3a64854d7a44680dc1a8e1ae2c5f92))
* Properly handle USB serial disconnects. ([3d13643](https://github.com/zmkfirmware/zmk-studio/commit/3d13643971ddf218412e7d51591891141156811d))
* Properly include keyboard page modifiers in the picker. ([cfda89e](https://github.com/zmkfirmware/zmk-studio/commit/cfda89e2ced2030dc7d0f72a8d9b3d041f4da697))
* Reopen the connect/lock modals if closed with esc. ([028c1c9](https://github.com/zmkfirmware/zmk-studio/commit/028c1c96f1627238e0d26421184d06c8d4e3ba53))
* Revert attempts at running tauri in container. ([e00bff4](https://github.com/zmkfirmware/zmk-studio/commit/e00bff4311f377b1dfce83d33dbf249a419eaf68))
* Selection state fixes. ([9b41000](https://github.com/zmkfirmware/zmk-studio/commit/9b41000b5e9e559b83d04fd54a3e00dab964ac45))
* Show selection of first key, binding fixes for no-params behaviors. ([32147a9](https://github.com/zmkfirmware/zmk-studio/commit/32147a90e1f2a748fadac0a3f9e22210015a3e06))
* Tweak macOS app signing for testing. ([6d8ef6c](https://github.com/zmkfirmware/zmk-studio/commit/6d8ef6cb69dab87cf8132547a767b3125bd54b24))
* Typo in a vendor name. ([35d0118](https://github.com/zmkfirmware/zmk-studio/commit/35d0118238930b94a8771108b93d008dac91de8e))
* Undo/redo fixes. ([8b25218](https://github.com/zmkfirmware/zmk-studio/commit/8b252185384b41df2d38823e546c891e80227cf7))


### Miscellaneous Chores

* Prepare 0.0.1 release ([1a233de](https://github.com/zmkfirmware/zmk-studio/commit/1a233de12cbe6be3be4e9a3ef766a0b1d9aa3ce1))
