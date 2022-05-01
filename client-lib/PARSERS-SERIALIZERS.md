# DataPM File Parsers and Serializers

This guide describes the parsers and serializers that are used to read and write data files.

## Quick Start

Find example parsers in the [src/connector/file-based/parser/](src/connector/file-based/parser/) director.

Find example serializers in the [src/connector/file-based/writer/](src/connector/file-based/writer/) directory.

First implement the ParserDescription or SerializerDescription interface. Then implement the Parser or Serializer interface.

Finally, add ParserDescription implementation to the [ParserUtil.ts](src/connector/file-based/parser/ParserUtil.ts) file, and DPMRecordSerializerDescription implementations to the [RecordSerializerUtil.ts](src/connector/file-based/writer/RecordSerializerUtil.ts) file.

## Descriptor class pattern

Do not import the Parser implementation in the top of the ParserDescription file. Instead, use the import statement directly in the `getParser()` method. This delays loading all the Parser dependencies until the parser is actually needed.

```typescript
function getParser(): Parser {
    const parser = import("./MyParser");
    return new parser.MyParser();
}
```

## File Based Sources and Sinks

DataPM provides [AbstractFileStreamSource.ts](src/connector/file-based/AbstractFileStreamSource.ts) and [AbstractFileSink.ts](src/connector/file-based/AbstractFileSink.ts) classes that are used for all "File Based" sources and sinks (HTTP, FTP, Local File, etc).

These file based sources share a set of parsers and serializers that are used to read and write data files. Therefore when you write a parser, it can be used by any file based source. Similarly, when you write a serializer, it can be used by any file based sink.

# Creating Data File Parsers

First, create a class that implements the `ParserDescription` interface. This class should be lightweight with few imports. See the note above about the [descriptor class pattern](#descriptor-class-pattern). The `supportsFileStream(...)` method will be given a very truncated buffer of beginning of the file. Generally the implementation should expect to read the header of the file to determine if it is supported.

Next create the `Parser` implementation. The `inspectFile(..) ` method should use the `jobContext` argument to prompt the user for input as necessary. The `getTransforms(...)` method is given the user's inputs in the `configuration` object, and should returns NodeJS Transform implementations in the correct order to transform the file byte stream into a stream of `RecordContext` objects.

Add your ParserDescription implementation to the [ParserUtil.ts](src/connector/file-based/parser/ParserUtil.ts) file.

## Compression and Archive Parsers

Parsers for "archive" file formats (example: zip and tar) should extend the [AbstractArchiveParser](src/connector/file-based/parser/AbstractArchiveParser.ts) class.

Parsers for single file "compression" file formats (example: gzip and bzip2) should extend the [AbstractPassThroughParser](src/connector/file-based/parser/AbstractPassThroughParser.ts) class.

# Creating File Serializers

To create a file serializer, that turns streams of RecordContext object into a file byte stream, create a class that implements the `DPMRecordSerializerDescription` class. Again, read the [descriptor class pattern](#descriptor-class-pattern) about delaying imports.

Next implement the `DPMRecordSerializer` class. The `getParameters(...)` method is called repeatedly until it returns an empty array. This allows for iteratively building prompt options for the user input. The `getTransforms(...)` method is given the user's inputs in the `configuration` object, and should returns NodeJS Transform implementations in the correct order to transform the stream of `RecordContext` objects into a file byte stream.

Add your DPMRecordSerializerDescription implementations to the [RecordSerializerUtil.ts](src/connector/file-based/writer/RecordSerializerUtil.ts) file.
