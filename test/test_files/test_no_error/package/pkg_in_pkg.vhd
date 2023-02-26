package pkg_in_pkg is
  package p is
      package a is
    end a;
  end p;
  -- TODO: Test pkg_in_pkg.vhd with new elaborate references
  -- use p.all;
  -- use p.a.all;
end package;
