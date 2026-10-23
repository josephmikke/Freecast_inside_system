import { MrssMappingTemplate } from '../../shared/dto/MrssDto';

export const DEFAULT_MRSS_MAPPING: MrssMappingTemplate = {
  root: '//channel/item',
  nextPage: '',
  guid: "*[name()='guid']/text()",
  extId: "*[name()='guid']/text()",
  title: "title | *[name()='media:title']/text()",
  description: "description | *[name()='media:description']/text()",
  asset:
    "*[name()='media:content'] ! map:merge(((@height|@width|@duration|@url) ! map{local-name(): string()}, @medium ! map{'type': string()}))",
  subtitle:
    "array { *[name()='media:group']/*[name()='media:subTitle'] ! map:merge((@type|@lang|@href) ! map{local-name(): string()})}",
  thumbnails:
    "array { *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})}",
  pubDate: 'pubDate',
  seasonNum:
    "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:seasonNum']/text() else ''",
  episodeNum:
    "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:episodeNum']/text() else ''",
  type: "*[name()='xumo:episodic']/@type",
  seriesId:
    "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:seriesId']/text() else ''",
  rotationStart:
    "if (exists(dcterms:valid)) then (substring-before(substring-after(*[name()='dcterms:valid']/text(), '='), ';')) else (fn:current-date())",
  rotationEnd:
    "if (exists(dcterms:valid)) then (substring-before(substring-after(*[name()='dcterms:valid']/text(), 'end='), ';')) else ((xs:string(fn:current-date()) ! concat(substring(string(), 0, 5) ! number() + 20, substring(string(), 5))))",
  rating: "*[name()='media:rating']/text()",
  cast: '',
  genres: "string-join(*[name()='media:category']/text(), ', ')",
  cuePoints:
    "if (exists(xumo:cuePoints)) then *[name()='xumo:cuePoints']/text() else ''",
  seriesMainThumbnail:
    "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
  seriesAltThumbnail:
    "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
  seriesBackgroundThumbnail:
    "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
  movieMainThumbnail:
    "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
  movieAltThumbnail:
    "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
  movieBackgroundThumbnail:
    "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
  episodeMainThumbnail:
    "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
  episodeAltThumbnail:
    "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
};
