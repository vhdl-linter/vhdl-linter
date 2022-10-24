package generic_pkg is
  generic (
    generic_parameter : integer := 0
    );
end package;
package body generic_pkg is
    constant generic_parameter : integer := 0; --multiple declaration (disable to get only one error)--vhdl-linter-disable-this-line

end package body;