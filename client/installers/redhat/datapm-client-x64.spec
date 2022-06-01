Name:           datapm-client
Version:        x.x.x
Release:        BUILD_NUMBER%{?dist}
Summary:        A package manager for data
BuildArch:      x86_64
URL:            https://datapm.io
License:        https://datapm.io/docs/license
Source0:        %{name}-%{version}-source.tar.gz

Requires:       libsecret
AutoReqProv:    no

%description
DataPM is a package manager for data. See more at https://datapm.io

%prep
rm -rf $RPM_BUILD_ROOT
mkdir -p ${RPM_BUILD_ROOT}/opt/datapm
cp -R ../../../../pkg-linux-intel64/* ${RPM_BUILD_ROOT}/opt/datapm

%install
echo "Install"

%clean
echo "Clean"

%post
ln -s /opt/datapm/datapm /usr/bin/datapm

%postun
rm -f /usr/bin/datapm

%files
/* 

%defattr(-,root,root,-)
/opt/datapm

%changelog
* Mon Feb 07 2021 Travis Collins <hello@datapm.io> - 0.0.1
- See https://github.com/big-armor/datapm/blob/master/CHANGELOG.md 