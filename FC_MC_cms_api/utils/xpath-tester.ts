import HttpClientAdaptor from '../routes/epg/shared/HttpClientAdaptor';
import MRSSParser from '../routes/vod/shared/parser/MRSSParser';
import MrssPathAdaptor from '../routes/vod/shared/parser/MrssPathAdaptor';

const httpClient = new HttpClientAdaptor();
const mrssPath = new MrssPathAdaptor();
// @ts-ignore
const mrssParser = new MRSSParser(httpClient, mrssPath);

(async () => {
  const mrss = await mrssParser.fetch('https://mission-support-assets.s3.us-west-2.amazonaws.com/static-mrss/entrepreneur_tv_v5.xml');

  // Act
  const results = await mrssParser.parse(mrss, {
    root: '//channel/item',
    nextPage: '',
    guid: 'guid',
    extId: 'guid',
    title: 'title',
    description: 'description',
    asset: "*[name()='media:content'] ! map:merge((map:entry('duration', 'NA'), (@height|@width|@url) ! map{local-name(): string()}, @medium ! map{'type': string()}))",
    subtitle: "array { *[name()='media:subTitle'] ! map:merge((@type|@lang|@href) ! map{local-name(): string()})}",
    thumbnails: "array { (*[name()='media:group']/*[name()='media:thumbnail'] | *[name()='media:thumbnail']) ! map:merge((@height|@width|@url) ! map{local-name(): string()})}",
    pubDate: 'pubDate',
    seasonNum: ".//*[name()='xumo:seasonNum']/text()",
    episodeNum: ".//*[name()='xumo:episodeNum']/text()",
    type: "*[name()='xumo:episodic']/@type",
    seriesId: ".//*[name()='xumo:seriesId']/text()",
    rotationStart: "if (exists(dcterms:valid) and string-length(dcterms:valid) > 0) then (substring-before(substring-after(*[name()='dcterms:valid']/text(), '='), ';')) else (fn:current-date())",
    rotationEnd: "if (exists(dcterms:valid) and string-length(dcterms:valid) > 0) then (substring-before(substring-after(*[name()='dcterms:valid']/text(), 'end='), ';')) else ((xs:string(fn:current-date()) ! concat(substring(string(), 0, 5) ! number() + 20, substring(string(), 5))))",
    rating: "*[name()='media:rating']/text()",
    cast: '',
    genres: "string-join(*[name()='media:keywords']/text(), ',')",
    cuePoints: "*[name()='xumo:cuePoints']/text()",
    seriesMainThumbnail: "*[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})",
    seriesAltThumbnail: 'map:merge(())',
    seriesBackgroundThumbnail: 'map:merge(())',
    movieMainThumbnail: 'map:merge(())',
    movieAltThumbnail: 'map:merge(())',
    movieBackgroundThumbnail: 'map:merge(())',
    episodeMainThumbnail: "*[name()='media:group']/*[name()='media:thumbnail'][2] ! map:merge((@height|@width|@url) ! map{local-name(): string()})",
    episodeAltThumbnail: 'map:merge(())',
  });
  console.log(JSON.stringify(results));
})();
