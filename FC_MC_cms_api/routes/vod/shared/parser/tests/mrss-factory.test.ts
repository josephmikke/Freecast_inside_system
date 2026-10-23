import { MrssEpisode, MrssMovie, MrssType } from '../../../../shared/dto/MrssDto';
import { MRSSError } from '../MRSSError';
import MrssFactory from '../MrssFactory';
import MrssPathAdaptor from '../MrssPathAdaptor';

describe('MRSS Factory', () => {
  describe('createSeries', () => {
    const mrssPath = new MrssPathAdaptor();
    const mrssFactory = new MrssFactory(mrssPath);

    it('should create an MrssSeries', () => {
      const [attributes] = mrssPath.toXMlObject('<item>\n'
          + '      <series>\n'
          + '        <director>Jean-Marc Therin</director>\n'
          + '        <categories>Drama,Crime,Foreign Language</categories>\n'
          + '        <starring>Marie Bunel, Jean-Baptiste Puech, Juliette Navis</starring>\n'
          + '        <secondaryIDs>\n'
          + '          <secondaryID type="Internal">11184802</secondaryID>\n'
          + '          <secondaryID type="Program">530</secondaryID>\n'
          + '        </secondaryIDs>\n'
          + '        <guid isPermaLink="false">22f4d494-37a2-4f92-8cff-0d142e21a372</guid>\n'
          + '        <tmsId>SH032403030000</tmsId>\n'
          + '        <title>Guilty As Charged</title>\n'
          + '        <description>Against the backdrop of everyday lawlessness in a French provincial city, the series paints a picture of people\'s lives when they slip out of control, veering into the comic, tragic or absurd.</description>\n'
          + '        <pubDate>2020-05-01T07:00:00Z</pubDate>\n'
          + '        <media:group>\n'
          + '          <media:thumbnail medium="image" width="1920" height="1080" type="image/jpg" url="https://images-us-az.crackle.com/profiles/channels/530/ChannelArtTTU_1920x1080.jpg?ts=20181217103036" contentStyle="keyArt" />\n'
          + '          <media:thumbnail medium="image" width="806" height="453" type="image/jpg" url="https://images-us-az.crackle.com/profiles/channels/530/OneSheetImageTTU_806_453.jpg?ts=20181217103046" contentStyle="keyArt" />\n'
          + '          </media:group>\n'
          + '        <media:keywords />\n'
          + '        <xumo:episodic type="series" />\n'
          + '      </series>\n'
          + '      <markets>\n'
          + '        <market region="US">\n'
          + '          <valid><start>2020-05-01T07:00:00Z</start><end>2051-01-01T07:59:00Z</end></valid>\n'
          + '        </market>\n'
          + '      </markets>\n'
          + '    </item>', '//item');
      const validMappingTemplate = {
        root: '//channel/item',
        nextPage: '',
        guid: './/guid',
        extId: './/secondaryIDs/secondaryID[@type="Media" or @type="Program"]/text()',
        title: './/title',
        asset: ".//*[name()='media:content'] ! map:merge((@height|@width|@duration|@type|@url) ! map{local-name(): string()})",
        thumbnails: "array { .//*[name()='media:group']/*[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})}",
        subtitle: "array { .//*[name()='media:subTitle'] ! map:merge((@type|@lang|@href) ! map{local-name(): string()})}",
        pubDate: './/pubDate',
        seasonNum: "*[name()='xumo:episodic']/*[name()='xumo:seasonNum']/text()",
        episodeNum: "*[name()='xumo:episodic']/*[name()='xumo:episodeNum']/text()",
        type: "*[name()='xumo:episodic']/@type",
        seriesId: "*[name()='xumo:episodic']/*[name()='xumo:seriesId']/text()",
        description: './/description',
        rotationEnd: "markets/market[@region='US']/*[local-name()='valid']/*[local-name()='end']/text()",
        rotationStart: "markets/market[@region='US']/*[local-name()='valid']/*[local-name()='start']/text()",
        rating: "*[name()='media:rating']/text()",
        cast: '',
        genres: './/categories',
        cuePoints: 'xumo:cuePoints',
        seriesMainThumbnail: '',
        seriesAltThumbnail: '',
        seriesBackgroundThumbnail: '',
        movieMainThumbnail: '',
        movieAltThumbnail: '',
        movieBackgroundThumbnail: '',
        episodeMainThumbnail: '',
        episodeAltThumbnail: '',
      };

      // Act
      const mrssSeries = mrssFactory.createSeries(attributes, validMappingTemplate);

      // Assert
      expect(mrssSeries).toEqual({
        guid: '22f4d494-37a2-4f92-8cff-0d142e21a372',
        extId: '530',
        title: 'Guilty As Charged',
        thumbnails: [{
          width: '1920',
          height: '1080',
          url: 'https://images-us-az.crackle.com/profiles/channels/530/ChannelArtTTU_1920x1080.jpg?ts=20181217103036',
        }, {
          width: '806',
          height: '453',
          url: 'https://images-us-az.crackle.com/profiles/channels/530/OneSheetImageTTU_806_453.jpg?ts=20181217103046',
        }],
        pubDate: '2020-05-01T07:00:00Z',
        description: 'Against the backdrop of everyday lawlessness in a French provincial city, the series paints a picture of people\'s lives when they slip out of control, veering into the comic, tragic or absurd.',
        cast: [],
        genres: ['Drama', 'Crime', 'Foreign Language'],
        type: MrssType.SERIES,
        rating: '',
        avail: {
          start: '2020-05-01T07:00:00Z',
          end: '2051-01-01T07:59:00Z',
        },
        seriesMainThumbnail: {},
        seriesAltThumbnail: {},
        seriesBackgroundThumbnail: {},
      });
    });

    describe('MrssSeries check empty field or attribute missing', () => {
      const generateXMLData = (title: string, desc: string, pubDate: string, guid: string, thumbnailAttr: string = '', subtitlesAttr: string = '') => ('<item>\n'
          + '      <series>\n'
          + '        <director>Jean-Marc Therin</director>\n'
          + '        <categories>Drama,Crime,Foreign Language</categories>\n'
          + '        <starring>Marie Bunel, Jean-Baptiste Puech, Juliette Navis</starring>\n'
          + '        <secondaryIDs>\n'
          + '          <secondaryID type="Internal">11184802</secondaryID>\n'
          + '          <secondaryID type="Program">530</secondaryID>\n'
          + '        </secondaryIDs>\n'
          + `        <guid isPermaLink="false">${guid}</guid>\n`
          + '        <tmsId>SH032403030000</tmsId>\n'
          + `        <title>${title}</title>\n`
          + `        <description>${desc}</description>\n`
          + `        <pubDate>${pubDate}</pubDate>\n`
          + '        <media:group>\n'
          + `          <media:thumbnail medium="image" ${thumbnailAttr === 'width' ? '' : 'width="1920"'} ${thumbnailAttr === 'height' ? '' : 'height="1080"'} type="image/jpg" ${thumbnailAttr === 'url' ? '' : 'url="https://images-us-az.crackle.com/profiles/channels/530/ChannelArtTTU_1920x1080.jpg?ts=20181217103036"'} contentStyle="keyArt" />\n`
          + '          <media:thumbnail medium="image" width="806" height="453" type="image/jpg" url="https://images-us-az.crackle.com/profiles/channels/530/OneSheetImageTTU_806_453.jpg?ts=20181217103046" contentStyle="keyArt" />\n'
          + '          </media:group>\n'
          + '        <media:keywords />\n'
          + '      <media:subTitles>\n'
          + `        <media:subTitle ${subtitlesAttr === 'type' ? '' : 'type="text/xml"'} ${subtitlesAttr === 'lang' ? '' : 'lang="en-US"'} ${subtitlesAttr === 'href' ? '' : 'href="https://secure-web-us-az-crackle-com.akamaized.net/1/v/mm/8e2yb_en-US_221111181106.xml"'} />\n'
          + '      </media:subTitles>\n`
          + '        <xumo:episodic type="series" />\n'
          + '      </series>\n'
          + '    </item>');

      const errorData = [
        {
          error: './/title returns an empty value while a non-empty or undefined is required',
          data: generateXMLData('', 'test', '2020-05-01T07:00:00Z', '22f4d494-37a2-4f92-8cff-0d142e21a372'),
        },
        {
          error: './/description returns an empty value while a non-empty or undefined is required',
          data: generateXMLData('Guilty As Charged', '', '2020-05-01T07:00:00Z', '22f4d494-37a2-4f92-8cff-0d142e21a372'),
        },
        // No pubDate case: MrssFactory no longer requires a non-empty pubDate
        {
          error: './/guid returns an empty value while a non-empty or undefined is required',
          data: generateXMLData('Guilty As Charged', 'test', '2020-05-01T07:00:00Z', ''),
        },
        {
          error: "height attributes from array { .//*[name()='media:group']/*[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})} field is missing or undefined",
          data: generateXMLData('Guilty As Charged', 'test', '2020-05-01T07:00:00Z', 'test', 'height'),
        },
        {
          error: "width attributes from array { .//*[name()='media:group']/*[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})} field is missing or undefined",
          data: generateXMLData('Guilty As Charged', 'test', '2020-05-01T07:00:00Z', 'test', 'width'),
        },
        {
          error: "url attributes from array { .//*[name()='media:group']/*[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})} field is missing or undefined",
          data: generateXMLData('Guilty As Charged', 'test', '2020-05-01T07:00:00Z', 'test', 'url'),
        },
        {
          error: "type attributes from array { .//*[name()='media:subTitle'] ! map:merge((@type|@lang|@href) ! map{local-name(): string()})} field is missing or undefined",
          data: generateXMLData('Guilty As Charged', 'test', '2020-05-01T07:00:00Z', 'test', '', 'type'),
        },
        {
          error: "lang attributes from array { .//*[name()='media:subTitle'] ! map:merge((@type|@lang|@href) ! map{local-name(): string()})} field is missing or undefined",
          data: generateXMLData('Guilty As Charged', 'test', '2020-05-01T07:00:00Z', 'test', '', 'lang'),
        },
        {
          error: "href attributes from array { .//*[name()='media:subTitle'] ! map:merge((@type|@lang|@href) ! map{local-name(): string()})} field is missing or undefined",
          data: generateXMLData('Guilty As Charged', 'test', '2020-05-01T07:00:00Z', 'test', '', 'href'),
        },
      ];

      it.each(errorData)('Empty field check', (error) => {
        const [attributes] = mrssPath.toXMlObject(
          error.data,
          '//item',
        );
        const validMappingTemplate = {
          root: '//channel/item',
          nextPage: '',
          guid: './/guid',
          extId: './/secondaryIDs/secondaryID[@type="Media" or @type="Program"]/text()',
          title: './/title',
          asset: ".//*[name()='media:content'] ! map:merge((@height|@width|@duration|@type|@url) ! map{local-name(): string()})",
          thumbnails: "array { .//*[name()='media:group']/*[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})}",
          subtitle: "array { .//*[name()='media:subTitle'] ! map:merge((@type|@lang|@href) ! map{local-name(): string()})}",
          pubDate: './/pubDate',
          seasonNum: "*[name()='xumo:episodic']/*[name()='xumo:seasonNum']/text()",
          episodeNum: "*[name()='xumo:episodic']/*[name()='xumo:episodeNum']/text()",
          type: "*[name()='xumo:episodic']/@type",
          seriesId: "*[name()='xumo:episodic']/*[name()='xumo:seriesId']/text()",
          description: './/description',
          rotationEnd: "markets/market[@region='US']/*[local-name()='valid']/*[local-name()='end']/text()",
          rotationStart: "markets/market[@region='US']/*[local-name()='valid']/*[local-name()='start']/text()",
          rating: "*[name()='media:rating']/text()",
          cast: '',
          genres: './/categories',
          cuePoints: 'xumo:cuePoints',
          seriesMainThumbnail: '',
          seriesAltThumbnail: '',
          seriesBackgroundThumbnail: '',
          movieMainThumbnail: '',
          movieAltThumbnail: '',
          movieBackgroundThumbnail: '',
          episodeMainThumbnail: '',
          episodeAltThumbnail: '',
        };

        // Act
        expect(() => mrssFactory.createSeries(attributes, validMappingTemplate))
          .toThrowError(new MRSSError.EmptyValue(error.error));
      });
    });

    it('should create an MrssEpisode', () => {
      const [attributes] = mrssPath.toXMlObject('<item>\n'
          + '      <guid isPermaLink="false">e6d5bead-8bb0-4de4-8e44-4d9577b83dd4</guid>\n'
          + '      <tmsId>EP032403030001</tmsId>\n'
          + '      <secondaryIDs>\n'
          + '        <secondaryID type="Internal">11184806</secondaryID>\n'
          + '        <secondaryID type="Media">2511772</secondaryID>\n'
          + '      </secondaryIDs>\n'
          + '      <title>Card Witheld</title>\n'
          + '      <description>Thefts, burglaries, petty crimes of all kind are developing. The police station is ccrowded. It becomes hard for our cops to cope with the stealing of evegetables in a garden and the shop lifting of a beautiful whore and the assault of an old lady by two teenagers.</description>\n'
          + '      <media:rating scheme="urn:mpaa">not rated</media:rating>\n'
          + '      <media:subTitles />\n'
          + '      <language>English</language>\n'
          + '      <markets>\n'
          + '        <market region="US">\n'
          + '          <valid xmlns="http://purl.org/dc/terms/">\n'
          + '            <start xmlns="">2020-05-01T07:00:00Z</start>\n'
          + '            <end xmlns="">2023-10-23T06:59:00Z</end>\n'
          + '          </valid>\n'
          + '        </market>\n'
          + '      </markets>\n'
          + '      <media:content width="1920" height="1080" duration="3088" type="video/mp4" medium="video" url="https://us-originalsourcevideo.s3-us-west-1.amazonaws.com/2511/2511772_GuiltyAsCharged_101_SMV_Eng-11184802-11184806-1920x1080.mp4" bitrate="18000" />\n'
          + '      <media:group>\n'
          + '        <media:thumbnail medium="image" width="1920" height="1080" type="image/jpg" url="https://images-us-am.crackle.com/1/n/mm/7ouyb_tnl_1920x1080.jpg?ts=20200320181249" contentStyle="iconic" />\n'
          + '        </media:group>\n'
          + '      <xumo:cuePoints>637.208,1367.000,2308.708</xumo:cuePoints>\n'
          + '      <pubDate>2020-05-01T07:00:00Z</pubDate>\n'
          + '      <media:actors>Marie Bunel, Jean-Baptiste Puech, Juliette Navis</media:actors>\n'
          + '      <xumo:episodic type="episode">\n'
          + '        <xumo:seriesId>22f4d494-37a2-4f92-8cff-0d142e21a372</xumo:seriesId>\n'
          + '        <xumo:seasonNum>1</xumo:seasonNum>\n'
          + '        <xumo:episodeNum>1</xumo:episodeNum>\n'
          + '      </xumo:episodic>\n'
          + '    </item>', '//item');
      const validMappingTemplate = {
        root: '//channel/item',
        nextPage: '',
        guid: './/guid',
        extId: './/secondaryIDs/secondaryID[@type="Media" or @type="Program"]/text()',
        title: './/title',
        asset: ".//*[name()='media:content'] ! map:merge((@height|@width|@duration|@type|@url) ! map{local-name(): string()})",
        thumbnails: "array { .//*[name()='media:group']/*[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})}",
        subtitle: "array { .//*[name()='media:subTitle'] ! map:merge((@type|@lang|@href) ! map{local-name(): string()})}",
        pubDate: './/pubDate',
        seasonNum: ".//*[name()='xumo:episodic']/*[name()='xumo:seasonNum']/text()",
        episodeNum: ".//*[name()='xumo:episodic']/*[name()='xumo:episodeNum']/text()",
        type: ".//*[name()='xumo:episodic']/@type",
        seriesId: ".//*[name()='xumo:episodic']/*[name()='xumo:seriesId']/text()",
        description: './/description',
        rotationEnd: "markets/market[@region='US']/*[local-name()='valid']/*[local-name()='end']/text()",
        rotationStart: "markets/market[@region='US']/*[local-name()='valid']/*[local-name()='start']/text()",
        rating: ".//*[name()='media:rating']/text()",
        cast: ".//*[name()='media:actors']/text()",
        genres: '',
        cuePoints: ".//*[name()='xumo:cuePoints']/text()",
        seriesMainThumbnail: '',
        seriesAltThumbnail: '',
        seriesBackgroundThumbnail: '',
        movieMainThumbnail: '',
        movieAltThumbnail: '',
        movieBackgroundThumbnail: '',
        episodeMainThumbnail: '',
        episodeAltThumbnail: '',
      };

      // Act
      const mrssEpisode = mrssFactory.createEpisode(attributes, validMappingTemplate);

      // Assert
      expect(mrssEpisode).toEqual<MrssEpisode>({
        guid: 'e6d5bead-8bb0-4de4-8e44-4d9577b83dd4',
        extId: '2511772',
        title: 'Card Witheld',
        thumbnails: [{
          width: '1920',
          height: '1080',
          url: 'https://images-us-am.crackle.com/1/n/mm/7ouyb_tnl_1920x1080.jpg?ts=20200320181249',
        }],
        pubDate: '2020-05-01T07:00:00Z',
        description: 'Thefts, burglaries, petty crimes of all kind are developing. The police station is ccrowded. It becomes hard for our cops to cope with the stealing of evegetables in a garden and the shop lifting of a beautiful whore and the assault of an old lady by two teenagers.',
        cast: [
          'Marie Bunel',
          'Jean-Baptiste Puech',
          'Juliette Navis',
        ],
        type: MrssType.EPISODE,
        asset: {
          url: 'https://us-originalsourcevideo.s3-us-west-1.amazonaws.com/2511/2511772_GuiltyAsCharged_101_SMV_Eng-11184802-11184806-1920x1080.mp4',
          duration: '3088',
          width: '1920',
          height: '1080',
          type: 'video/mp4',
        },
        rating: 'not rated',
        subtitles: [],
        cuePoints: [
          '637.208',
          '1367.000',
          '2308.708',
        ],
        seriesId: '22f4d494-37a2-4f92-8cff-0d142e21a372',
        season: '1',
        episode: '1',
        avail: {
          start: '2020-05-01T07:00:00Z',
          end: '2023-10-23T06:59:00Z',
        },
        genres: [],
        episodeMainThumbnail: {},
        episodeAltThumbnail: {},
      });
    });

    it('should create an MrssMovie', () => {
      const [attributes] = mrssPath.toXMlObject('<item>\n'
        + '      <guid isPermaLink="false">3648a7de-c993-4130-bf76-e3569e262ed9</guid>\n'
        + '      <tmsId>MV000066400000</tmsId>\n'
        + '      <secondaryIDs>\n'
        + '        <secondaryID type="Internal">57069</secondaryID>\n'
        + '        <secondaryID type="Media">2519998</secondaryID>\n'
        + '      </secondaryIDs>\n'
        + '      <title>Night of the Living Dead</title>\n'
        + '      <description>The brains of the recently deceased have become mysteriously reanimated, causing the dead to rise and feed on human flesh. George Romero\'s Night of the Living Dead is hailed as one of the most influential horror films of all time - inspirational, thought provoking, and most importantly, terrifying!</description>\n'
        + '      <media:rating scheme="urn:v-chip">tv-ma</media:rating>\n'
        + '      <media:keywords />\n'
        + '      <media:subTitles>\n'
        + '        <media:subTitle type="text/xml" lang="en-US" href="https://secure-web-us-az-crackle-com.akamaized.net/1/v/mm/8e2yb_en-US_221111181106.xml" />\n'
        + '        <media:subTitle type="text/vtt" lang="en-US" href="https://secure-web-us-az-crackle-com.akamaized.net/1/v/mm/8e2yb_en-US_221111181106.vtt" />\n'
        + '      </media:subTitles>\n'
        + '      <language>English</language>\n'
        + '      <markets>\n'
        + '        <market region="US">\n'
        + '          <valid xmlns="http://purl.org/dc/terms/">\n'
        + '            <start xmlns="">2021-10-01T07:00:00Z</start>\n'
        + '            <end xmlns="">2051-01-01T07:59:00Z</end>\n'
        + '          </valid>\n'
        + '        </market>\n'
        + '      </markets>\n'
        + '      <airDates>\n'
        + '        <aired>1968-10-04T00:00:00Z</aired>\n'
        + '      </airDates>\n'
        + '      <media:content width="1920" height="1080" duration="5734" type="video/mp4" medium="video" url="https://us-originalsourcevideo.s3-us-west-1.amazonaws.com/2519/2519998_NightOfTheLivingDead_1968_TheFilmDetective_Eng-57069-57069-1920x1080.mp4" bitrate="18000" />\n'
        + '      <media:group>\n'
        + '        <media:thumbnail medium="image" width="1920" height="1080" type="image/jpg" url="https://images-us-am.crackle.com/1/v/mm/8e2yb_tnl_1920x1080.jpg?ts=20210921220240" contentStyle="iconic" />\n'
        + '        <media:thumbnail medium="image" width="1024" height="1024" type="image/jpg" url="https://images-us-am.crackle.com/1/v/mm/8e2yb_tnl_1024x1024.jpg?ts=20210921220240" contentStyle="iconic" />\n'
        + '        <media:thumbnail medium="image" width="1280" height="720" type="image/jpg" url="https://images-us-am.crackle.com/1/v/mm/8e2yb_tnl_1280x720.jpg?ts=20210921220240" contentStyle="iconic" />\n'
        + '      </media:group>\n'
        + '      <xumo:cuePoints>940.791,1563.208,2253.500,2901.708,3584.958,4154.875,4826.000</xumo:cuePoints>\n'
        + '      <pubDate>2021-10-01T07:00:00Z</pubDate>\n'
        + '      <media:writers>John A. Russo, George A. Romero</media:writers>\n'
        + '      <media:producers>Karl Hardman, Russell Streiner</media:producers>\n'
        + '      <media:directors>George A. Romero, George A. Romero</media:directors>\n'
        + '      <media:actors>Duane Jones, Judith O\'Dea</media:actors>\n'
        + '      <media:categories>Classics,Horror,Thriller</media:categories>\n'
        + '    </item>', '//item');
      const validMappingTemplate = {
        root: '//channel/item',
        nextPage: '',
        guid: './/guid',
        extId: './/secondaryIDs/secondaryID[@type="Media" or @type="Program"]/text()',
        title: './/title',
        asset: ".//*[name()='media:content'] ! map:merge((@height|@width|@duration|@type|@url) ! map{local-name(): string()})",
        thumbnails: "array { .//*[name()='media:group']/*[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})}",
        subtitle: "array { .//*[name()='media:subTitle'] ! map:merge((@type|@lang|@href) ! map{local-name(): string()})}",
        pubDate: './/pubDate',
        seasonNum: '',
        episodeNum: '',
        type: '',
        seriesId: '',
        description: './/description',
        rotationEnd: "markets/market[@region='US']/*[local-name()='valid']/*[local-name()='end']/text()",
        rotationStart: "markets/market[@region='US']/*[local-name()='valid']/*[local-name()='start']/text()",
        rating: ".//*[name()='media:rating']/text()",
        cast: ".//*[name()='media:actors']/text()",
        genres: ".//*[name()='media:categories']/text()",
        cuePoints: ".//*[name()='xumo:cuePoints']/text()",
        seriesMainThumbnail: '',
        seriesAltThumbnail: '',
        seriesBackgroundThumbnail: '',
        movieMainThumbnail: '',
        movieAltThumbnail: '',
        movieBackgroundThumbnail: '',
        episodeMainThumbnail: '',
        episodeAltThumbnail: '',
      };

      // Act
      const mrssMovie = mrssFactory.createMovie(attributes, validMappingTemplate);

      // Assert
      expect(mrssMovie).toEqual<MrssMovie>({
        guid: '3648a7de-c993-4130-bf76-e3569e262ed9',
        extId: '2519998',
        title: 'Night of the Living Dead',
        thumbnails: [
          {
            width: '1920',
            height: '1080',
            url: 'https://images-us-am.crackle.com/1/v/mm/8e2yb_tnl_1920x1080.jpg?ts=20210921220240',
          },
          {
            width: '1024',
            height: '1024',
            url: 'https://images-us-am.crackle.com/1/v/mm/8e2yb_tnl_1024x1024.jpg?ts=20210921220240',
          },
          {
            width: '1280',
            height: '720',
            url: 'https://images-us-am.crackle.com/1/v/mm/8e2yb_tnl_1280x720.jpg?ts=20210921220240',
          },
        ],
        pubDate: '2021-10-01T07:00:00Z',
        description: 'The brains of the recently deceased have become mysteriously reanimated, causing the dead to rise and feed on human flesh. George Romero\'s Night of the Living Dead is hailed as one of the most influential horror films of all time - inspirational, thought provoking, and most importantly, terrifying!',
        cast: [
          'Duane Jones',
          "Judith O'Dea",
        ],
        genres: [
          'Classics',
          'Horror',
          'Thriller',
        ],
        type: MrssType.MOVIE,
        rating: 'tv-ma',
        asset: {
          url: 'https://us-originalsourcevideo.s3-us-west-1.amazonaws.com/2519/2519998_NightOfTheLivingDead_1968_TheFilmDetective_Eng-57069-57069-1920x1080.mp4',
          duration: '5734',
          width: '1920',
          height: '1080',
          type: 'video/mp4',
        },
        subtitles: [
          {
            href: 'https://secure-web-us-az-crackle-com.akamaized.net/1/v/mm/8e2yb_en-US_221111181106.xml',
            type: 'text/xml',
            lang: 'en-US',
          },
          {
            href: 'https://secure-web-us-az-crackle-com.akamaized.net/1/v/mm/8e2yb_en-US_221111181106.vtt',
            type: 'text/vtt',
            lang: 'en-US',
          },
        ],
        cuePoints: [
          '940.791', '1563.208', '2253.500', '2901.708', '3584.958', '4154.875', '4826.000',
        ],
        avail: {
          start: '2021-10-01T07:00:00Z',
          end: '2051-01-01T07:59:00Z',
        },
        movieMainThumbnail: {},
        movieAltThumbnail: {},
        movieBackgroundThumbnail: {},
      });
    });
  });
});
