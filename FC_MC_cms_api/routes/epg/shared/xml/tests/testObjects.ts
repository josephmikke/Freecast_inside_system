export const xmlMappingTemplate: JSON = <JSON><unknown> {
  epg_program: '//Programs/Program',
  title: '@ProgramTitle',
  ext_id: '@SeriesId',
  start_time: {
    date: 'Schedules/Schedule/@CalendarDT',
    date_format: '%Y-%m-%d %H:%M:%S',
    time: '',
    time_format: '',
    method: 'concat',
  },
  end_time: {
    date: 'Schedules/Schedule/@CalendarEDT',
    date_format: '%Y-%m-%d %H:%M:%S',
    time: '',
    time_format: '',
    method: '',
  },
  duration: {
    duration: 'Schedules/Schedule/@Duration',
    duration_format: 'minutes',
  },
  thumbnail: 'RichMedia/Images/Image/@FileLocation',
  description: 'PgmDescriptions/PgmDescription/Description',
};

export const xmlPayload: string = '<?xml version="1.0" encoding="UTF-8"?><ns0:Rovi_Listings SourceRegion="North America" Station="" xmlns:ns0="http://Rovi.Ingest.Listings.External"><Programs><Program StationProgramID="" ProgramType="Series" Category="Other" ProgramTitle="NASA 50th Anniversary Documentary" OriginalTitle="NASA 50th Anniversary Documentary" SeriesId="11246766" Runtime="29" PrimaryLanguage="English" OriginalTitleLanguage="English" CountryOfOrigin="United States" ProdCompany="" DistName="Wurl" PgmColorType="Color" Caption="None" AiringType="Repeat" AudioLevel="Stereo" HDTVLevel="720p" DVI="false" ThreeDFormat="3D Level Unknown" OriginalAirDate="2021-04-30T14:58:15Z" YearOfRelease="2021" SeriesEpisodeNumber="2" SeriesSeasonNumber="1" SeriesEpisodeTitle="Ask Nasa"> <Ratings> <PgmRating Type="US TV" Rating="TV-PG"> <RatingReasons/> </PgmRating> </Ratings> <PgmDescriptions> <PgmDescription> <Type>ShortDescription</Type> <Description>Descriptionum Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</Description> </PgmDescription> </PgmDescriptions> <RichMedia> <Images> <Image FileLocation="https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/11246766-TCL-Thumbnail_v1.jpeg" Type="Program: Key" AssetID="206490879" Title="TCL-Thumbnail" FileName="11246766-TCL-Thumbnail_v1.jpeg" FileFormat="JPEG"> <Rights> <Right Title="Wurl Integrations" StartDate="2021-08-20" EndDate="2031-08-20"/> </Rights> </Image> <Image FileLocation="https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/Ask-Nasa-2-default_v5.jpeg" Type="Program: Supporting" AssetID="168172284" Title="default" FileName="Ask-Nasa-2-default_v5.jpeg" FileFormat="JPEG"> <Rights> <Right Title="Wurl Integrations" StartDate="2021-04-26" EndDate="2031-04-26"/> </Rights> </Image> <Image FileLocation="https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/Ask-Nasa-2-defaults_v1.jpeg" Type="Program: Supporting" AssetID="184289413" Title="defaults" FileName="Ask-Nasa-2-defaults_v1.jpeg" FileFormat="JPEG"> <Rights> <Right Title="Wurl Integrations" StartDate="2021-06-08" EndDate="2031-06-08"/> </Rights> </Image> </Images> </RichMedia> <Schedules> <Schedule TimeZone="" CalendarDT="2022-08-23 00:00:00" CalendarEDT="2022-08-23 00:29:00" StartTime="00:00" Duration="29" AspectRatio="16:9 Unknown" SAP="false" Subtitled="false" PgmColorType="Color" Caption="None" AudioLevel="Stereo" HDTVLevel="720p" DVI="false" JoinedInProgress="false" SubjectToBlackout="false" IsEncrypted="false" StarRating="None" ThreeDFormat="3D Level Unknown" AffiliateStation=""/> </Schedules> </Program> <Program StationProgramID="" ProgramType="OTO" Category="Other" ProgramTitle="Nasa Launch" OriginalTitle="Nasa Launch" SeriesId="11401745" Runtime="30" PrimaryLanguage="English" OriginalTitleLanguage="English" CountryOfOrigin="United States" ProdCompany="" DistName="Wurl" PgmColorType="Color" Caption="None" AiringType="Repeat" AudioLevel="Stereo" HDTVLevel="720p" DVI="false" ThreeDFormat="3D Level Unknown" OriginalAirDate="2021-04-30T14:58:15Z" YearOfRelease="2021"> <Ratings> <PgmRating Type="US TV" Rating="TV-PG"> <RatingReasons/> </PgmRating> </Ratings> <PgmDescriptions> <PgmDescription> <Type>ShortDescription</Type> <Description>Third Descriptionum Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</Description> </PgmDescription> </PgmDescriptions> <RichMedia> <Images> <Image FileLocation="https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5567-7615/Ask-Nasa-3-default_v5.jpeg" Type="Program: Key" AssetID="169783329" Title="default" FileName="Ask-Nasa-3-default_v5.jpeg" FileFormat="JPEG"> <Rights> <Right Title="Wurl Integrations" StartDate="2021-04-30" EndDate="2031-04-30"/> </Rights> </Image> </Images> </RichMedia> <Schedules> <Schedule TimeZone="" CalendarDT="2022-08-23 00:29:00" CalendarEDT="2022-08-23 00:59:00" StartTime="00:29" Duration="30" AspectRatio="16:9 Unknown" SAP="false" Subtitled="false" PgmColorType="Color" Caption="None" AudioLevel="Stereo" HDTVLevel="720p" DVI="false" JoinedInProgress="false" SubjectToBlackout="false" IsEncrypted="false" StarRating="None" ThreeDFormat="3D Level Unknown" AffiliateStation=""/> </Schedules> </Program> <Program StationProgramID="" ProgramType="OTO" Category="Other" ProgramTitle="Inside the Nasa World" OriginalTitle="Inside the Nasa World" SeriesId="11401746" Runtime="30" PrimaryLanguage="English" OriginalTitleLanguage="English" CountryOfOrigin="United States" ProdCompany="" DistName="Wurl" PgmColorType="Color" Caption="None" AiringType="Repeat" AudioLevel="Stereo" HDTVLevel="720p" DVI="false" ThreeDFormat="3D Level Unknown" OriginalAirDate="2021-04-30T14:58:15Z" YearOfRelease="2021"> <Ratings> <PgmRating Type="US TV" Rating="TV-PG"> <RatingReasons/> </PgmRating> </Ratings> <PgmDescriptions> <PgmDescription> <Type>ShortDescription</Type> <Description>Fourth Descriptionum Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</Description> </PgmDescription> </PgmDescriptions> <RichMedia> <Images> <Image FileLocation="https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5567-7615/Ask-Nasa-4-default_v5.jpeg" Type="Program: Key" AssetID="169783330" Title="default" FileName="Ask-Nasa-4-default_v5.jpeg" FileFormat="JPEG"> <Rights> <Right Title="Wurl Integrations" StartDate="2021-04-30" EndDate="2031-04-30"/> </Rights> </Image> <Image FileLocation="https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5567-7615/11401746-vtest_v1.jpg" Type="Program: Supporting" AssetID="261666330" Title="vtest" FileName="11401746-vtest_v1.jpg" FileFormat="JPEG"> <Rights> <Right Title="Wurl Integrations" StartDate="2022-03-10" EndDate="2032-03-10"/> </Rights> </Image> </Images> </RichMedia> <Schedules> <Schedule TimeZone="" CalendarDT="2022-08-23 00:59:00" CalendarEDT="2022-08-23 01:29:00" StartTime="00:59" Duration="30" AspectRatio="16:9 Unknown" SAP="false" Subtitled="false" PgmColorType="Color" Caption="None" AudioLevel="Stereo" HDTVLevel="720p" DVI="false" JoinedInProgress="false" SubjectToBlackout="false" IsEncrypted="false" StarRating="None" ThreeDFormat="3D Level Unknown" AffiliateStation=""/> </Schedules> </Program></Programs></ns0:Rovi_Listings>';

export const xmlMappingTemplate2: JSON = <JSON><unknown> {
  epg_program: '//Programs/Program',
  title: '@ProgramTitle',
  ext_id: '@SeriesId',
  start_time: {
    date: 'Schedules/Schedule/@CalendarDT',
    date_format: '%Y-%m-%d',
    time: 'Schedules/Schedule/@CalendarTM',
    time_format: '%H:%M:%S',
    method: 'concat',
  },
  end_time: {
    date: 'Schedules/Schedule/@CalendarEDT',
    date_format: '%Y-%m-%d',
    time: 'Schedules/Schedule/@CalendarETM',
    time_format: '%H:%M:%S',
    method: 'concat',
  },
  duration: {
    duration: '',
    duration_format: '',
  },
  thumbnail: 'RichMedia/Images/Image/@FileLocation',
  description: 'PgmDescriptions/PgmDescription/Description',
  subtitle: '@Subtitle',
  catchup: true,
};

export const xmlPayload2: string = '<?xml version="1.0" encoding="UTF-8"?><ns0:Rovi_Listings SourceRegion="North America" Station="" xmlns:ns0="http://Rovi.Ingest.Listings.External"><Programs><Program StationProgramID="" ProgramType="Series" Category="Other" ProgramTitle="NASA 50th Anniversary Documentary" OriginalTitle="NASA 50th Anniversary Documentary" Subtitle="NASA 50th Anniversary Documentary" SeriesId="11246766" Runtime="29" PrimaryLanguage="English" OriginalTitleLanguage="English" CountryOfOrigin="United States" ProdCompany="" DistName="Wurl" PgmColorType="Color" Caption="None" AiringType="Repeat" AudioLevel="Stereo" HDTVLevel="720p" DVI="false" ThreeDFormat="3D Level Unknown" OriginalAirDate="2021-04-30T14:58:15Z" YearOfRelease="2021" SeriesEpisodeNumber="2" SeriesSeasonNumber="1" SeriesEpisodeTitle="Ask Nasa"> <Ratings> <PgmRating Type="US TV" Rating="TV-PG"> <RatingReasons/> </PgmRating> </Ratings> <PgmDescriptions> <PgmDescription> <Type>ShortDescription</Type> <Description>Descriptionum Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</Description> </PgmDescription> </PgmDescriptions> <RichMedia> <Images> <Image FileLocation="https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/11246766-TCL-Thumbnail_v1.jpeg" Type="Program: Key" AssetID="206490879" Title="TCL-Thumbnail" FileName="11246766-TCL-Thumbnail_v1.jpeg" FileFormat="JPEG"> <Rights> <Right Title="Wurl Integrations" StartDate="2021-08-20" EndDate="2031-08-20"/> </Rights> </Image> <Image FileLocation="https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/Ask-Nasa-2-default_v5.jpeg" Type="Program: Supporting" AssetID="168172284" Title="default" FileName="Ask-Nasa-2-default_v5.jpeg" FileFormat="JPEG"> <Rights> <Right Title="Wurl Integrations" StartDate="2021-04-26" EndDate="2031-04-26"/> </Rights> </Image> <Image FileLocation="https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/Ask-Nasa-2-defaults_v1.jpeg" Type="Program: Supporting" AssetID="184289413" Title="defaults" FileName="Ask-Nasa-2-defaults_v1.jpeg" FileFormat="JPEG"> <Rights> <Right Title="Wurl Integrations" StartDate="2021-06-08" EndDate="2031-06-08"/> </Rights> </Image> </Images> </RichMedia> <Schedules> <Schedule TimeZone="" CalendarDT="2022-08-23" CalendarTM="00:00:00" CalendarEDT="2022-08-23" CalendarETM="00:29:00" StartTime="00:00" Duration="29" AspectRatio="16:9 Unknown" SAP="false" Subtitled="false" PgmColorType="Color" Caption="None" AudioLevel="Stereo" HDTVLevel="720p" DVI="false" JoinedInProgress="false" SubjectToBlackout="false" IsEncrypted="false" StarRating="None" ThreeDFormat="3D Level Unknown" AffiliateStation=""/> </Schedules> </Program></Programs></ns0:Rovi_Listings>';

export const xmlMappingTemplate3: JSON = <JSON><unknown> {
  epg_program: '//Programs/Program',
  title: '@ProgramTitle',
  ext_id: '@SeriesId',
  start_time: {
    date: 'Schedules/Schedule/@CalendarDT',
    date_format: '',
    time: '',
    time_format: '',
    method: '',
  },
  end_time: {
    date: 'Schedules/Schedule/@CalendarEDT',
    date_format: '',
    time: '',
    time_format: '',
    method: '',
  },
  duration: {
    duration: 'Schedules/Schedule/@Duration',
    duration_format: 'minutes',
  },
  thumbnail: 'RichMedia/Images/Image/@FileLocation',
  description: 'PgmDescriptions/PgmDescription/Description',
  subtitle: '@Subtitle',
  catchup: true,
  slug: '@Slug',
};

export const xmlPayload3: string = '<?xml version="1.0" encoding="UTF-8"?><ns0:Rovi_Listings SourceRegion="North America" Station="" xmlns:ns0="http://Rovi.Ingest.Listings.External"><Programs><Program StationProgramID="" ProgramType="Series" Category="Other" ProgramTitle="NASA 50th Anniversary Documentary" OriginalTitle="NASA 50th Anniversary Documentary" Subtitle="NASA 50th Anniversary Documentary" SeriesId="11246766" Runtime="29" PrimaryLanguage="English" OriginalTitleLanguage="English" CountryOfOrigin="United States" ProdCompany="" DistName="Wurl" PgmColorType="Color" Caption="None" AiringType="Repeat" AudioLevel="Stereo" HDTVLevel="720p" DVI="false" ThreeDFormat="3D Level Unknown" OriginalAirDate="2021-04-30T14:58:15Z" YearOfRelease="2021" SeriesEpisodeNumber="2" SeriesSeasonNumber="1" SeriesEpisodeTitle="Ask Nasa" Slug="333"> <Ratings> <PgmRating Type="US TV" Rating="TV-PG"> <RatingReasons/> </PgmRating> </Ratings> <PgmDescriptions> <PgmDescription> <Type>ShortDescription</Type> <Description>Descriptionum Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</Description> </PgmDescription> </PgmDescriptions> <RichMedia> <Images> <Image FileLocation="https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/11246766-TCL-Thumbnail_v1.jpeg" Type="Program: Key" AssetID="206490879" Title="TCL-Thumbnail" FileName="11246766-TCL-Thumbnail_v1.jpeg" FileFormat="JPEG"> <Rights> <Right Title="Wurl Integrations" StartDate="2021-08-20" EndDate="2031-08-20"/> </Rights> </Image> <Image FileLocation="https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/Ask-Nasa-2-default_v5.jpeg" Type="Program: Supporting" AssetID="168172284" Title="default" FileName="Ask-Nasa-2-default_v5.jpeg" FileFormat="JPEG"> <Rights> <Right Title="Wurl Integrations" StartDate="2021-04-26" EndDate="2031-04-26"/> </Rights> </Image> <Image FileLocation="https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/Ask-Nasa-2-defaults_v1.jpeg" Type="Program: Supporting" AssetID="184289413" Title="defaults" FileName="Ask-Nasa-2-defaults_v1.jpeg" FileFormat="JPEG"> <Rights> <Right Title="Wurl Integrations" StartDate="2021-06-08" EndDate="2031-06-08"/> </Rights> </Image> </Images> </RichMedia> <Schedules> <Schedule TimeZone="" CalendarDT="2022-08-23T00:00:00Z" CalendarEDT="2022-08-23T00:29:00Z" StartTime="00:00" Duration="29" AspectRatio="16:9 Unknown" SAP="false" Subtitled="false" PgmColorType="Color" Caption="None" AudioLevel="Stereo" HDTVLevel="720p" DVI="false" JoinedInProgress="false" SubjectToBlackout="false" IsEncrypted="false" StarRating="None" ThreeDFormat="3D Level Unknown" AffiliateStation=""/> </Schedules> </Program></Programs></ns0:Rovi_Listings>';
