Use Master
GO
EXEC master.dbo.xp_create_subdir 'C:\DanpheHealthInc_PvtLtd_Files'
go
if db_id('Danphe_PACS') is not null
BEGIN
  ALTER DATABASE [Danphe_PACS] SET SINGLE_USER WITH ROLLBACK IMMEDIATE
  Drop Database [Danphe_PACS]
END
GO
Create Database Danphe_PACS
Go
use Danphe_PACS
go
EXEC sp_configure filestream_access_level, 2  
RECONFIGURE  
ALTER DATABASE Danphe_PACS
ADD FILEGROUP Dicom_FileStream CONTAINS FILESTREAM  
GO  
ALTER DATABASE Danphe_PACS
ADD FILE  
(  
    NAME= 'Dicom_FileStream',  
    FILENAME = 'C:\DanpheHealthInc_PvtLtd_Files\Dicom_FileStreams'
)  
TO FILEGROUP Dicom_FileStream  
GO

USE [Danphe_PACS]
GO
/****** Object:  Table [dbo].[DCM_DicomFiles]    Script Date: 2/15/2018 5:56:11 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DCM_DicomFiles](
	[DicomFileId] [bigint] IDENTITY(1,1) NOT NULL,
	[SOPInstanceUID] [nvarchar](200) NOT NULL,
	[ROWGUID] [uniqueidentifier] ROWGUIDCOL  NOT NULL,
	[SeriesId] [int] NULL,
	[FileName] [varchar](128) NULL,
	[FilePath] [varchar](2000) NULL,
	[FileBinaryData] [varbinary](max) FILESTREAM  NULL,
	[FileToolData][varchar](max) NULL,
	[ModifiedBy][int] NULL,
	[ModifiedOn][datetime] NULL,
 CONSTRAINT [PK_DCM_DicomFiles] PRIMARY KEY CLUSTERED 
(
	[DicomFileId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY] FILESTREAM_ON [Dicom_FileStream],
UNIQUE NONCLUSTERED 
(
	[ROWGUID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] FILESTREAM_ON [Dicom_FileStream]
GO
/****** Object:  Table [dbo].[DCM_PatientStudy]    Script Date: 2/15/2018 5:56:11 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DCM_PatientStudy](
	[PatientStudyId] [int] IDENTITY(1,1) NOT NULL,
	[TenantId] [int] NULL,
	[TenantName] [varchar](200) NULL,
	[PatientId] [varchar](200) NULL,
	[PatientName] [varchar](200) NULL,
	[StudyInstanceUID] [varchar](200) NULL,
	[SOPClassUID] [varchar](200) NULL,
	[Modality] [varchar](100) NULL,
	[StudyDescription] [varchar](100) NULL,
	[StudyDate] [datetime] NULL,
	[IsMapped] [bit] NULL,
 CONSTRAINT [PK_DCM_PatientStudy] PRIMARY KEY CLUSTERED 
(
	[PatientStudyId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DCM_Series]    Script Date: 2/15/2018 5:56:11 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DCM_Series](
	[SeriesId] [int] IDENTITY(1,1) NOT NULL,
	[PatientStudyId] [int] NULL,
	[SeriesInstanceUID] [varchar](200) NULL,
	[SeriesDescription] [varchar](200) NULL,
 CONSTRAINT [PK_DCM_Series] PRIMARY KEY CLUSTERED 
(
	[SeriesId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[DCM_DicomFiles]  WITH CHECK ADD  CONSTRAINT [FK_DCM_DicomFiles_DCM_Series] FOREIGN KEY([SeriesId])
REFERENCES [dbo].[DCM_Series] ([SeriesId])
GO
ALTER TABLE [dbo].[DCM_DicomFiles] CHECK CONSTRAINT [FK_DCM_DicomFiles_DCM_Series]
GO
ALTER TABLE [dbo].[DCM_Series]  WITH CHECK ADD  CONSTRAINT [FK_DCM_Series_DCM_PatientStudy] FOREIGN KEY([PatientStudyId])
REFERENCES [dbo].[DCM_PatientStudy] ([PatientStudyId])
GO
ALTER TABLE [dbo].[DCM_Series] CHECK CONSTRAINT [FK_DCM_Series_DCM_PatientStudy]
GO
Alter table DCM_DicomFiles
Add CreatedOn DateTime null
Go

Alter table DCM_PatientStudy
Add CreatedOn DateTime null
Go

Alter table DCM_Series
Add CreatedOn DateTime null
Go

Alter table DCM_PatientStudy
drop column TenantId
Go

Alter table DCM_PatientStudy
drop column TenantName
Go





----START: 29MAR 2019 : Rajesh: Incremental DbScript for DanpheEmr Database------
--change name of database from below query line as per your system emr database name
--beow we give DEV_DanpheEMR you can replace this as per your local emr db name
IF (NOT EXISTS(select * from DEV_DanpheEMR.dbo.CORE_CFG_Parameters where ParameterGroupName = 'Dicom' and ParameterName = 'DicomImageLoaderUrl') ) 
BEGIN 
    INSERT INTO DEV_DanpheEMR.dbo.CORE_CFG_Parameters 
    VALUES('Dicom',	'DicomImageLoaderUrl'	,'dicomweb://localhost:56326/api/Dicom/byDicomFileId?dicomFileId=',	'string',	'DicomImagLoaderUrl for Load Images by DicomFileId.','custom') 
END 
ELSE 
BEGIN 
    UPDATE  DEV_DanpheEMR.dbo.CORE_CFG_Parameters
SET 
    ParameterValue = 'dicomweb://localhost:56326/api/Dicom/byDicomFileId?dicomFileId='
where ParameterGroupName = 'Dicom' and ParameterName = 'DicomImageLoaderUrl'
END
GO
--END: 29MAR 2019 : Rajesh: Incremental DbScript for DanpheEmr Database------
