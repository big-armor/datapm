Name:           datapm-client
Version:        x.x.x
Release:        1%{?dist}
Summary:        A simple hello world script
BuildArch:      x86_64
URL:            https://datapm.io
License:        https://datapm.io/docs/license
Source0:        %{name}-%{version}-source.tar.gz

Requires:       bash libsecret

%description
DataPM is a package manager for data. See more at https://datapm.io

%prep
rm -rf $RPM_BUILD_ROOT
mkdir -p ${RPM_BUILD_ROOT}
cp -R ../../../../pkg-linux-intel64/* ${RPM_BUILD_ROOT}

%install
echo "Install"

%clean
echo "Clean"

%post
ln -s %{base_install_dir}/datapm /usr/bin/datapm

%postun
rm -f /usr/bin/datapm

%changelog
* Mon Feb 07 2021 Travis Collins <hello@datapm.io> - 0.0.1
- These changelogs are not maintained.